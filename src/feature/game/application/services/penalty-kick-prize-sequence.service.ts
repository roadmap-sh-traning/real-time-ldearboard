import { randomUUID } from "node:crypto";
import { GameType } from "../../domain/game-type";
import {
  PenaltyKickPrizeSequence,
  PenaltyKickPrizeStep,
  PrizeSequenceId,
} from "../../domain/penalty-kick-prize-sequence";
import { PrizeSequenceRepository } from "../ports/outbound/prize-sequence.repository";
import { parsePenaltyKickPrizeSequenceFromExcel } from "../../infrastructure/outbound/excel-prize-sequence.parser";

export class PenaltyKickPrizeSequenceService {
  constructor(private readonly sequences: PrizeSequenceRepository) {}

  async getSequenceById(
    sequenceId: PrizeSequenceId,
  ): Promise<PenaltyKickPrizeSequence | undefined> {
    return this.sequences.getSequenceById(sequenceId);
  }

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

    await this.sequences.saveSequence(sequence);
    return sequence;
  }

  async getStepForKick(input: {
    userId: number;
    matchId: string;
  }): Promise<{ sequence: PenaltyKickPrizeSequence; step: PenaltyKickPrizeStep }> {
    const progress = await this.sequences.getProgress({
      userId: input.userId,
      matchId: input.matchId,
    });

    if (!progress) {
      throw new Error("Penalty kick progress is not initialized for this match");
    }

    const sequence = await this.sequences.getSequenceById(progress.sequenceId);
    if (!sequence) {
      throw new Error(`Prize sequence ${progress.sequenceId} not found`);
    }

    if (sequence.gameType !== "penalty-kicks") {
      throw new Error("Prize sequence is not for penalty-kicks");
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
    sequenceId: PrizeSequenceId;
  }): Promise<PenaltyKickPrizeSequence> {
    const sequence = await this.sequences.getSequenceById(input.sequenceId);
    if (!sequence) {
      throw new Error(`Prize sequence ${input.sequenceId} not found`);
    }

    if (sequence.gameType !== "penalty-kicks") {
      throw new Error("Prize sequence is not for penalty-kicks");
    }

    if (sequence.steps.length === 0) {
      throw new Error("Prize sequence has no steps");
    }

    await this.sequences.resetProgress({
      userId: input.userId,
      matchId: input.matchId,
      sequenceId: sequence.id,
      nextStepIndex: 0,
    });

    return sequence;
  }

  async advanceAfterKick(input: {
    userId: number;
    matchId: string;
  }): Promise<number> {
    const progress = await this.sequences.advanceProgress(input);
    return progress.nextStepIndex;
  }
}
