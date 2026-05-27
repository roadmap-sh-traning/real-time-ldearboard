import { test } from "node:test";
import * as assert from "node:assert/strict";
import { GameType } from "../../../src/feature/game/domain/game-type";
import { GameService } from "../../../src/feature/game/application/services/game.service";
import { EventPublisher } from "../../../src/feature/game/application/ports/outbound/event-publisher.port";
import { MatchRepository } from "../../../src/feature/game/application/ports/outbound/match.repository";
import { PlayerRepository } from "../../../src/feature/game/application/ports/outbound/player.repository";
import { ScoreEventRepository } from "../../../src/feature/game/application/ports/outbound/score-event.repository";
import { GameEvent } from "../../../src/feature/game/domain/events";
import { Match } from "../../../src/feature/game/domain/match";
import { Player, PlayerId } from "../../../src/feature/game/domain/player";
import { ScoreEventRecord } from "../../../src/feature/game/domain/score-event";
import { WalletService } from "../../../src/feature/wallet/application/services/wallet.service";

class InMemoryPlayerRepository implements PlayerRepository {
  private readonly players = new Map<PlayerId, Player>();

  async findById(id: PlayerId): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async save(player: Player): Promise<void> {
    this.players.set(player.id, player);
  }
}

class InMemoryMatchRepository implements MatchRepository {
  private readonly matches = new Map<string, Match>();

  async findById(id: string): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, match);
  }
}

class InMemoryScoreEventRepository implements ScoreEventRepository {
  readonly events: ScoreEventRecord[] = [];

  async append(event: ScoreEventRecord): Promise<void> {
    this.events.push(event);
  }
}

class RecordingEventPublisher implements EventPublisher {
  readonly events: GameEvent[] = [];

  publish(event: GameEvent): void {
    this.events.push(event);
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

class InMemoryWalletLedgerRepository {
  private readonly mainBalances = new Map<number, number>();
  private readonly gameBalances = new Map<string, number>();

  async ensureAccounts(input: {
    userId: number;
    gameType: GameType;
  }): Promise<{
    userId: number;
    gameType: GameType;
    mainBalance: number;
    gameBalance: number;
  }> {
    if (!this.mainBalances.has(input.userId)) {
      this.mainBalances.set(input.userId, 0);
    }

    const gameKey = `${input.userId}:${input.gameType}`;
    if (!this.gameBalances.has(gameKey)) {
      this.gameBalances.set(gameKey, 0);
    }

    return {
      userId: input.userId,
      gameType: input.gameType,
      mainBalance: this.mainBalances.get(input.userId) ?? 0,
      gameBalance: this.gameBalances.get(gameKey) ?? 0,
    };
  }

  async creditMainWallet(input: {
    userId: number;
    amount: number;
  }): Promise<void> {
    const nextBalance = (this.mainBalances.get(input.userId) ?? 0) + input.amount;
    this.mainBalances.set(input.userId, nextBalance);
  }

  async transferFunds(input: {
    userId: number;
    gameType: GameType;
    amount: number;
    direction: "main-to-game" | "game-to-main";
  }): Promise<void> {
    const snapshot = await this.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });
    const nextMainBalance =
      input.direction === "main-to-game"
        ? snapshot.mainBalance - input.amount
        : snapshot.mainBalance + input.amount;
    const nextGameBalance =
      input.direction === "main-to-game"
        ? snapshot.gameBalance + input.amount
        : snapshot.gameBalance - input.amount;

    this.mainBalances.set(input.userId, nextMainBalance);
    this.gameBalances.set(
      `${input.userId}:${input.gameType}`,
      nextGameBalance,
    );
  }

  async debitGameWallet(input: {
    userId: number;
    gameType: GameType;
    amount: number;
  }): Promise<void> {
    const snapshot = await this.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });
    this.gameBalances.set(
      `${input.userId}:${input.gameType}`,
      snapshot.gameBalance - input.amount,
    );
  }

  async listTransactionsByUser(): Promise<never[]> {
    return [];
  }
}

function createPenaltyKickService(): {
  service: GameService;
  players: InMemoryPlayerRepository;
  matches: InMemoryMatchRepository;
  scoreEvents: InMemoryScoreEventRepository;
  eventPublisher: RecordingEventPublisher;
  wallets: WalletService;
  ledger: InMemoryWalletLedgerRepository;
} {
  const players = new InMemoryPlayerRepository();
  const matches = new InMemoryMatchRepository();
  const scoreEvents = new InMemoryScoreEventRepository();
  const eventPublisher = new RecordingEventPublisher();
  const ledger = new InMemoryWalletLedgerRepository();
  const wallets = new WalletService(ledger as never);

  const service = new GameService(
    players,
    matches,
    scoreEvents,
    eventPublisher,
    wallets,
  );

  return { service, players, matches, scoreEvents, eventPublisher, wallets, ledger };
}

test("penalty kick win credits main wallet and updates score", async () => {
  const { service, players, eventPublisher, wallets, ledger } =
    createPenaltyKickService();

  await players.save({ id: 7, name: "alice@example.com", score: 0 });
  await ledger.creditMainWallet({ userId: 7, amount: 100 });
  await ledger.transferFunds({
    userId: 7,
    gameType: "penalty-kicks",
    amount: 50,
    direction: "main-to-game",
  });

  await service.joinMatch({
    playerId: 7,
    playerName: "alice@example.com",
    matchId: "match-penalty",
    gameType: "penalty-kicks",
  });

  await service.submitPenaltyKick({
    playerId: 7,
    matchId: "match-penalty",
    gameType: "penalty-kicks",
    directionIndex: 2,
    won: true,
    scoreWon: 15,
    stakeAmount: 0,
  });

  assert.deepEqual(await wallets.getBalances({ userId: 7, gameType: "penalty-kicks" }), {
    userId: 7,
    gameType: "penalty-kicks",
    mainBalance: 65,
    gameBalance: 50,
  });
  assert.equal((await players.findById(7))?.score, 15);
  assert.equal(eventPublisher.events.at(-2)?.type, "penalty-kick.result");
  assert.deepEqual(eventPublisher.events.at(-2), {
    type: "penalty-kick.result",
    matchId: "match-penalty",
    gameType: "penalty-kicks",
    playerId: 7,
    directionIndex: 2,
    won: true,
    amount: 15,
    mainBalance: 65,
    gameBalance: 50,
    at: eventPublisher.events.at(-2)?.at,
  });
});

test("penalty kick loss debits game wallet balance", async () => {
  const { service, players, eventPublisher, wallets, ledger } =
    createPenaltyKickService();

  await players.save({ id: 7, name: "alice@example.com", score: 0 });
  await ledger.creditMainWallet({ userId: 7, amount: 100 });
  await ledger.transferFunds({
    userId: 7,
    gameType: "penalty-kicks",
    amount: 40,
    direction: "main-to-game",
  });

  await service.joinMatch({
    playerId: 7,
    playerName: "alice@example.com",
    matchId: "match-penalty",
    gameType: "penalty-kicks",
  });

  await service.submitPenaltyKick({
    playerId: 7,
    matchId: "match-penalty",
    gameType: "penalty-kicks",
    directionIndex: 3,
    won: false,
    scoreWon: 0,
    stakeAmount: 10,
  });

  assert.deepEqual(await wallets.getBalances({ userId: 7, gameType: "penalty-kicks" }), {
    userId: 7,
    gameType: "penalty-kicks",
    mainBalance: 60,
    gameBalance: 30,
  });
  assert.equal((await players.findById(7))?.score, 0);
  assert.equal(eventPublisher.events.at(-1)?.type, "penalty-kick.result");
  assert.deepEqual(eventPublisher.events.at(-1), {
    type: "penalty-kick.result",
    matchId: "match-penalty",
    gameType: "penalty-kicks",
    playerId: 7,
    directionIndex: 3,
    won: false,
    amount: 10,
    mainBalance: 60,
    gameBalance: 30,
    at: eventPublisher.events.at(-1)?.at,
  });
});
