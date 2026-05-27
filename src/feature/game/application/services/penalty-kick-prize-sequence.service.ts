import { randomUUID } from "node:crypto";
import { GameType } from "../../domain/game-type";
import {
  PenaltyKickPrizeSequence,
  PenaltyKickPrizeStep,
} from "../../domain/penalty-kick-prize-sequence";
import { PrizeSequenceRepository } from "../ports/outbound/prize-sequence.repository";
import { parsePenaltyKickPrizeSequenceFromExcel } from "../../infrastructure/outbound/excel-prize-sequence.parser";

export class PenaltyKickPrizeSequenceService {
  constructor(private readonly sequences: PrizeSequenceRepository) {}

  async getActiveSequence(
    gameType: GameType = "penalty-kicks",
  ): Promise<PenaltyKickPrizeSequence | undefined> {
    return this.sequences.getActiveSequence(gameType);
  }

  async uploadFromExcel(input: {
    gameType?: GameType;
    fileBuffer: Buffer;
  }): Promise<PenaltyKickPrizeSequence> {
    const gameType = input.gameType ?? "penalty-kicks";
    const steps = parsePenaltyKickPrizeSequenceFromExcel(input.fileBuffer);
    const sequence: PenaltyKickPrizeSequence = {
      id: randomUUID(),
      gameType,
      steps,
      createdAt: new Date(),
    };

    await this.sequences.replaceActiveSequence(sequence);
    return sequence;
  }

  async getStepForKick(input: {
    userId: number;
    matchId: string;
    gameType?: GameType;
  }): Promise<{ sequence: PenaltyKickPrizeSequence; step: PenaltyKickPrizeStep }> {
    const gameType = input.gameType ?? "penalty-kicks";
    const sequence = await this.sequences.getActiveSequence(gameType);
    if (!sequence) {
      throw new Error("No active prize sequence configured for penalty-kicks");
    }

    const progress = await this.sequences.getProgress({
      userId: input.userId,
      matchId: input.matchId,
    });

    if (!progress || progress.sequenceId !== sequence.id) {
      throw new Error("Penalty kick progress is not initialized for this match");
    }

    const step = sequence.steps[progress.nextStepIndex];
    if (!step) {
      throw new Error("Prize sequence exhausted for this match");
    }

    return { sequence, step };
  }

  async initializeMatchProgress(input: {
    userId: number;
    matchId: string;
    gameType?: GameType;
  }): Promise<void> {
    const gameType = input.gameType ?? "penalty-kicks";
    const sequence = await this.sequences.getActiveSequence(gameType);
    if (!sequence) {
      throw new Error("No active prize sequence configured for penalty-kicks");
    }

    await this.sequences.resetProgress({
      userId: input.userId,
      matchId: input.matchId,
      sequenceId: sequence.id,
      nextStepIndex: 0,
    });
  }

  async advanceAfterKick(input: {
    userId: number;
    matchId: string;
  }): Promise<number> {
    const progress = await this.sequences.advanceProgress(input);
    return progress.nextStepIndex;
  }
}
