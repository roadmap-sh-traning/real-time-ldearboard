import { test } from "node:test";
import * as assert from "node:assert/strict";
import { GameType } from "../../../src/feature/game/domain/game-type";
import { GameService } from "../../../src/feature/game/application/services/game.service";
import { EventPublisher } from "../../../src/feature/game/application/ports/outbound/event-publisher.port";
import { MatchRepository } from "../../../src/feature/game/application/ports/outbound/match.repository";
import { PlayerRepository } from "../../../src/feature/game/application/ports/outbound/player.repository";
import { ScoreEventRepository } from "../../../src/feature/game/application/ports/outbound/score-event.repository";
import { PrizeSequenceRepository } from "../../../src/feature/game/application/ports/outbound/prize-sequence.repository";
import { PenaltyKickPrizeSequenceService } from "../../../src/feature/game/application/services/penalty-kick-prize-sequence.service";
import { GameEvent } from "../../../src/feature/game/domain/events";
import { Match } from "../../../src/feature/game/domain/match";
import { Player, PlayerId } from "../../../src/feature/game/domain/player";
import { ScoreEventRecord } from "../../../src/feature/game/domain/score-event";
import {
  PenaltyKickPrizeSequence,
  PenaltyKickProgress,
} from "../../../src/feature/game/domain/penalty-kick-prize-sequence";
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

  async ensureAccounts(input: { userId: number; gameType: GameType }) {
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

  async creditMainWallet(input: { userId: number; amount: number }) {
    const nextBalance = (this.mainBalances.get(input.userId) ?? 0) + input.amount;
    this.mainBalances.set(input.userId, nextBalance);
  }

  async transferFunds(input: {
    userId: number;
    gameType: GameType;
    amount: number;
    direction: "main-to-game" | "game-to-main";
  }) {
    const snapshot = await this.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });
    this.mainBalances.set(
      input.userId,
      input.direction === "main-to-game"
        ? snapshot.mainBalance - input.amount
        : snapshot.mainBalance + input.amount,
    );
    this.gameBalances.set(
      `${input.userId}:${input.gameType}`,
      input.direction === "main-to-game"
        ? snapshot.gameBalance + input.amount
        : snapshot.gameBalance - input.amount,
    );
  }

  async debitGameWallet(input: {
    userId: number;
    gameType: GameType;
    amount: number;
  }) {
    const snapshot = await this.ensureAccounts({
      userId: input.userId,
      gameType: input.gameType,
    });
    this.gameBalances.set(
      `${input.userId}:${input.gameType}`,
      snapshot.gameBalance - input.amount,
    );
  }

  async listTransactionsByUser() {
    return [];
  }
}

const defaultTestSequence: PenaltyKickPrizeSequence = {
  id: "sequence-test",
  gameType: "penalty-kicks",
  createdAt: new Date(),
  steps: [
    { stepIndex: 0, won: true, prizeAmount: 15, stakeAmount: 0 },
    { stepIndex: 1, won: false, prizeAmount: 0, stakeAmount: 10 },
  ],
};

class InMemoryPrizeSequenceRepository implements PrizeSequenceRepository {
  private readonly sequences = new Map<string, PenaltyKickPrizeSequence>([
    [defaultTestSequence.id, defaultTestSequence],
  ]);
  private readonly progress = new Map<string, PenaltyKickProgress>();

  async getSequenceById(sequenceId: string) {
    return this.sequences.get(sequenceId);
  }

  async getActiveSequence() {
    return defaultTestSequence;
  }

  async saveSequence(sequence: PenaltyKickPrizeSequence) {
    this.sequences.set(sequence.id, sequence);
  }

  async replaceActiveSequence(sequence: PenaltyKickPrizeSequence) {
    this.sequences.set(sequence.id, sequence);
  }

  async getProgress(input: { userId: number; matchId: string }) {
    return this.progress.get(`${input.userId}:${input.matchId}`);
  }

  async resetProgress(progress: PenaltyKickProgress) {
    this.progress.set(`${progress.userId}:${progress.matchId}`, { ...progress });
  }

  async advanceProgress(input: { userId: number; matchId: string }) {
    const key = `${input.userId}:${input.matchId}`;
    const existing = this.progress.get(key);
    if (!existing) {
      throw new Error("Penalty kick progress not found");
    }

    const updated = {
      ...existing,
      nextStepIndex: existing.nextStepIndex + 1,
    };
    this.progress.set(key, updated);
    return updated;
  }
}

function createPenaltyKickService() {
  const players = new InMemoryPlayerRepository();
  const matches = new InMemoryMatchRepository();
  const scoreEvents = new InMemoryScoreEventRepository();
  const eventPublisher = new RecordingEventPublisher();
  const ledger = new InMemoryWalletLedgerRepository();
  const wallets = new WalletService(ledger as never);
  const prizeSequences = new PenaltyKickPrizeSequenceService(
    new InMemoryPrizeSequenceRepository(),
  );
  const service = new GameService(
    players,
    matches,
    scoreEvents,
    eventPublisher,
    wallets,
    prizeSequences,
  );

  return { service, players, eventPublisher, wallets, ledger };
}

test("penalty kick join requires sequenceId", async () => {
  const { service } = createPenaltyKickService();

  await assert.rejects(
    () =>
      service.joinMatch({
        playerId: 7,
        playerName: "alice@example.com",
        matchId: "match-penalty",
        gameType: "penalty-kicks",
      }),
    /sequenceId is required/,
  );
});

test("penalty kick win uses prize sequence and credits main wallet", async () => {
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
    sequenceId: "sequence-test",
  });

  await service.submitPenaltyKick({
    playerId: 7,
    matchId: "match-penalty",
    gameType: "penalty-kicks",
    directionIndex: 2,
  });

  assert.deepEqual(await wallets.getBalances({ userId: 7, gameType: "penalty-kicks" }), {
    userId: 7,
    gameType: "penalty-kicks",
    mainBalance: 65,
    gameBalance: 50,
  });
  assert.equal((await players.findById(7))?.score, 15);

  const resultEvent = eventPublisher.events.find(
    (event) => event.type === "penalty-kick.result",
  );
  assert.equal(resultEvent?.won, true);
  assert.equal(resultEvent?.amount, 15);
  assert.equal(resultEvent?.sequenceStepIndex, 0);
  assert.equal(resultEvent?.remainingSteps, 1);
});

test("penalty kick loss uses next sequence step and debits game wallet", async () => {
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
    sequenceId: "sequence-test",
  });

  await service.submitPenaltyKick({
    playerId: 7,
    matchId: "match-penalty",
    gameType: "penalty-kicks",
    directionIndex: 1,
  });
  await service.submitPenaltyKick({
    playerId: 7,
    matchId: "match-penalty",
    gameType: "penalty-kicks",
    directionIndex: 3,
  });

  assert.deepEqual(await wallets.getBalances({ userId: 7, gameType: "penalty-kicks" }), {
    userId: 7,
    gameType: "penalty-kicks",
    mainBalance: 75,
    gameBalance: 30,
  });
  assert.equal((await players.findById(7))?.score, 15);

  const lossEvent = eventPublisher.events.filter(
    (event) => event.type === "penalty-kick.result",
  )[1];
  assert.equal(lossEvent?.won, false);
  assert.equal(lossEvent?.amount, 10);
  assert.equal(lossEvent?.sequenceStepIndex, 1);
  assert.equal(lossEvent?.remainingSteps, 0);
});
