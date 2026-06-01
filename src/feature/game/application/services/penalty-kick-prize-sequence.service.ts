import { randomUUID } from "node:crypto";
import { GameType } from "../../domain/game-type";
import {
  buildGeneratedPenaltyKickSteps,
  DEFAULT_GENERATED_SEQUENCE_STEPS,
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
    activate?: boolean;
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
    if (input.activate !== false) {
      await this.sequences.activateSequence(sequence.id, gameType);
    }
    return sequence;
  }

  async generateSequence(input: {
    gameType?: GameType;
    stepCount?: number;
    activate?: boolean;
  }): Promise<PenaltyKickPrizeSequence> {
    const gameType = input.gameType ?? "penalty-kicks";
    const stepCount = input.stepCount ?? DEFAULT_GENERATED_SEQUENCE_STEPS;
    const steps = buildGeneratedPenaltyKickSteps(stepCount);
    const sequence: PenaltyKickPrizeSequence = {
      id: randomUUID(),
      gameType,
      steps,
      createdAt: new Date(),
    };

    await this.sequences.saveSequence(sequence);
    if (input.activate !== false) {
      await this.sequences.activateSequence(sequence.id, gameType);
    }
    return sequence;
  }

  async activateSequence(
    sequenceId: PrizeSequenceId,
    gameType: GameType = "penalty-kicks",
  ): Promise<PenaltyKickPrizeSequence> {
    await this.sequences.activateSequence(sequenceId, gameType);
    const sequence = await this.sequences.getSequenceById(sequenceId);
    if (!sequence) {
      throw new Error(`Prize sequence ${sequenceId} not found`);
    }
    return sequence;
  }

  async ensureDefaultActiveSequence(
    gameType: GameType = "penalty-kicks",
  ): Promise<PenaltyKickPrizeSequence> {
    const existing = await this.sequences.getActiveSequence(gameType);
    if (existing) {
      return existing;
    }

    return this.generateSequence({
      gameType,
      stepCount: DEFAULT_GENERATED_SEQUENCE_STEPS,
      activate: true,
    });
  }

  async resolveSequenceIdForMatch(
    sequenceId: string | undefined,
    gameType: GameType = "penalty-kicks",
  ): Promise<PrizeSequenceId> {
    const trimmed = sequenceId?.trim();
    if (trimmed) {
      return trimmed;
    }

    const active = await this.sequences.getActiveSequence(gameType);
    if (!active) {
      throw new Error(
        "No active prize sequence for penalty-kicks. Upload one or wait for the default sequence.",
      );
    }

    return active.id;
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
