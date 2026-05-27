import { MatchRepository } from "../../ports/outbound/match.repository";
import { PlayerRepository } from "../../ports/outbound/player.repository";
import { ScoreEventRepository } from "../../ports/outbound/score-event.repository";
import { EventPublisher } from "../../ports/outbound/event-publisher.port";
import { WalletService } from "../../../../wallet/application/services/wallet.service";
import { PenaltyKickPrizeSequenceService } from "../penalty-kick-prize-sequence.service";
import {
  GameHandler,
  JoinMatchCommand,
  LeaveMatchCommand,
  SubmitPenaltyKickCommand,
  SubmitScoreCommand,
} from "../game-handler-registry";
import {
  addPlayer,
  createMatch,
  Match,
  MatchId,
  removePlayer,
} from "../../../domain/match";
import { GameType } from "../../../domain/game-type";
import { resolvePenaltyKickOutcome } from "../../../domain/penalty-kick-prize-sequence";
import { applyScoreDelta, createPlayer } from "../../../domain/player";

export class PenaltyKicksGameHandler implements GameHandler {
  readonly gameType = "penalty-kicks" as const;

  constructor(
    private readonly players: PlayerRepository,
    private readonly matches: MatchRepository,
    private readonly scoreEvents: ScoreEventRepository,
    private readonly events: EventPublisher,
    private readonly wallets: WalletService,
    private readonly prizeSequences: PenaltyKickPrizeSequenceService,
  ) {}

  async joinMatch(input: JoinMatchCommand): Promise<void> {
    this.assertGameType(input.gameType);

    const player =
      (await this.players.findById(input.playerId)) ??
      createPlayer(input.playerId, input.playerName);
    await this.players.save(player);

    const match = await this.getOrCreateMatch(input.matchId);
    const updated = addPlayer(match, input.playerId);
    await this.matches.save(updated);

    await this.prizeSequences.initializeMatchProgress({
      userId: input.playerId,
      matchId: input.matchId,
    });

    this.events.publish({
      type: "player.joined",
      matchId: input.matchId,
      gameType: updated.gameType,
      playerId: input.playerId,
      playerName: player.name,
      at: new Date(),
    });
  }

  async submitScore(_input: SubmitScoreCommand): Promise<void> {
    throw new Error("Use penalty-kick message for penalty-kicks game type");
  }

  async submitPenaltyKick(input: SubmitPenaltyKickCommand): Promise<void> {
    this.assertGameType(input.gameType);
    this.assertDirectionIndex(input.directionIndex);

    const match = await this.matches.findById(input.matchId);
    if (!match || !match.playerIds.has(input.playerId)) {
      throw new Error("Player not in match");
    }
    this.assertPersistedGameType(match.gameType);

    const player = await this.players.findById(input.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const { sequence, step } = await this.prizeSequences.getStepForKick({
      userId: input.playerId,
      matchId: input.matchId,
    });
    const { won, amount } = resolvePenaltyKickOutcome(step);
    const reference = `penalty-kick:${input.matchId}:${step.stepIndex}:${input.directionIndex}`;
    let balances;

    if (won) {
      await this.wallets.creditSharedWallet({
        userId: input.playerId,
        amount,
        reference,
      });
      balances = await this.wallets.getBalances({
        userId: input.playerId,
        gameType: this.gameType,
      });
    } else {
      balances = await this.wallets.debitGameWallet({
        userId: input.playerId,
        gameType: this.gameType,
        amount,
        reference,
      });
    }

    const updatedPlayer = won ? applyScoreDelta(player, amount) : player;
    if (won) {
      await this.players.save(updatedPlayer);
    }

    await this.scoreEvents.append({
      userId: input.playerId,
      matchId: input.matchId,
      gameType: this.gameType,
      delta: won ? amount : -amount,
      scoreAfter: updatedPlayer.score,
    });

    const nextStepIndex = await this.prizeSequences.advanceAfterKick({
      userId: input.playerId,
      matchId: input.matchId,
    });

    this.events.publish({
      type: "penalty-kick.result",
      matchId: input.matchId,
      gameType: this.gameType,
      playerId: input.playerId,
      directionIndex: input.directionIndex,
      won,
      amount,
      sequenceId: sequence.id,
      sequenceStepIndex: step.stepIndex,
      remainingSteps: Math.max(sequence.steps.length - nextStepIndex, 0),
      mainBalance: balances.mainBalance,
      gameBalance: balances.gameBalance,
      at: new Date(),
    });

    if (won) {
      this.events.publish({
        type: "score.updated",
        matchId: input.matchId,
        gameType: this.gameType,
        playerId: input.playerId,
        newScore: updatedPlayer.score,
        at: new Date(),
      });
    }
  }

  async leaveMatch(input: LeaveMatchCommand): Promise<void> {
    this.assertGameType(input.gameType);

    const match = await this.matches.findById(input.matchId);
    if (!match) return;
    this.assertPersistedGameType(match.gameType);

    const updated = removePlayer(match, input.playerId);
    await this.matches.save(updated);

    this.events.publish({
      type: "player.left",
      matchId: input.matchId,
      gameType: updated.gameType,
      playerId: input.playerId,
      at: new Date(),
    });
  }

  private async getOrCreateMatch(matchId: MatchId): Promise<Match> {
    const existing = await this.matches.findById(matchId);
    if (!existing) {
      return createMatch(matchId, this.gameType);
    }

    this.assertPersistedGameType(existing.gameType);
    return existing;
  }

  private assertGameType(actual: GameType): void {
    if (this.gameType !== actual) {
      throw new Error("Game type mismatch");
    }
  }

  private assertPersistedGameType(actual: GameType): void {
    if (this.gameType !== actual) {
      throw new Error("Game type mismatch");
    }
  }

  private assertDirectionIndex(directionIndex: number): void {
    if (
      !Number.isInteger(directionIndex) ||
      directionIndex < 0 ||
      directionIndex > 3
    ) {
      throw new Error(
        "directionIndex must be a non-negative integer between 0 and 3",
      );
    }
  }
}
