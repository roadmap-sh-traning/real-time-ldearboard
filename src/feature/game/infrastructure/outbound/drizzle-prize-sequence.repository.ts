import { and, asc, eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { GameType } from "../../domain/game-type";
import { MatchId } from "../../domain/match";
import { PlayerId } from "../../domain/player";
import {
  PenaltyKickPrizeSequence,
  PenaltyKickPrizeStep,
  PenaltyKickProgress,
} from "../../domain/penalty-kick-prize-sequence";
import { PrizeSequenceRepository } from "../../application/ports/outbound/prize-sequence.repository";

export class DrizzlePrizeSequenceRepository implements PrizeSequenceRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async getSequenceById(
    sequenceId: string,
  ): Promise<PenaltyKickPrizeSequence | undefined> {
    const [sequenceRow] = await this.db
      .select()
      .from(schema.gamePrizeSequences)
      .where(eq(schema.gamePrizeSequences.id, sequenceId))
      .limit(1);

    if (!sequenceRow) return undefined;

    return this.loadSequenceWithSteps(sequenceRow);
  }

  async getActiveSequence(
    gameType: GameType,
  ): Promise<PenaltyKickPrizeSequence | undefined> {
    const [sequenceRow] = await this.db
      .select()
      .from(schema.gamePrizeSequences)
      .where(
        and(
          eq(schema.gamePrizeSequences.gameType, gameType),
          eq(schema.gamePrizeSequences.isActive, 1),
        ),
      )
      .limit(1);

    if (!sequenceRow) return undefined;

    return this.loadSequenceWithSteps(sequenceRow);
  }

  async saveSequence(sequence: PenaltyKickPrizeSequence): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(schema.gamePrizeSequences).values({
        id: sequence.id,
        gameType: sequence.gameType,
        isActive: 0,
        createdAt: sequence.createdAt,
      });

      if (sequence.steps.length > 0) {
        await tx.insert(schema.gamePrizeSequenceSteps).values(
          sequence.steps.map((step) => ({
            sequenceId: sequence.id,
            stepIndex: step.stepIndex,
            won: step.won ? 1 : 0,
            prizeAmount: step.prizeAmount,
            stakeAmount: step.stakeAmount,
          })),
        );
      }
    });
  }

  async replaceActiveSequence(sequence: PenaltyKickPrizeSequence): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.gamePrizeSequences)
        .set({ isActive: 0 })
        .where(
          and(
            eq(schema.gamePrizeSequences.gameType, sequence.gameType),
            eq(schema.gamePrizeSequences.isActive, 1),
          ),
        );

      await tx.insert(schema.gamePrizeSequences).values({
        id: sequence.id,
        gameType: sequence.gameType,
        isActive: 1,
        createdAt: sequence.createdAt,
      });

      if (sequence.steps.length > 0) {
        await tx.insert(schema.gamePrizeSequenceSteps).values(
          sequence.steps.map((step) => ({
            sequenceId: sequence.id,
            stepIndex: step.stepIndex,
            won: step.won ? 1 : 0,
            prizeAmount: step.prizeAmount,
            stakeAmount: step.stakeAmount,
          })),
        );
      }
    });
  }

  async getProgress(input: {
    userId: PlayerId;
    matchId: MatchId;
  }): Promise<PenaltyKickProgress | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.penaltyKickProgress)
      .where(
        and(
          eq(schema.penaltyKickProgress.userId, input.userId),
          eq(schema.penaltyKickProgress.matchId, input.matchId),
        ),
      )
      .limit(1);

    if (!row) return undefined;

    return {
      userId: row.userId,
      matchId: row.matchId,
      sequenceId: row.sequenceId,
      nextStepIndex: row.nextStepIndex,
    };
  }

  async resetProgress(progress: PenaltyKickProgress): Promise<void> {
    const now = new Date();
    await this.db
      .insert(schema.penaltyKickProgress)
      .values({
        userId: progress.userId,
        matchId: progress.matchId,
        sequenceId: progress.sequenceId,
        nextStepIndex: progress.nextStepIndex,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          schema.penaltyKickProgress.userId,
          schema.penaltyKickProgress.matchId,
        ],
        set: {
          sequenceId: progress.sequenceId,
          nextStepIndex: progress.nextStepIndex,
          updatedAt: now,
        },
      });
  }

  async advanceProgress(input: {
    userId: PlayerId;
    matchId: MatchId;
  }): Promise<PenaltyKickProgress> {
    const existing = await this.getProgress(input);
    if (!existing) {
      throw new Error("Penalty kick progress not found");
    }

    const updated: PenaltyKickProgress = {
      ...existing,
      nextStepIndex: existing.nextStepIndex + 1,
    };
    await this.resetProgress(updated);
    return updated;
  }

  private async loadSequenceWithSteps(sequenceRow: {
    id: string;
    gameType: string;
    createdAt: Date;
  }): Promise<PenaltyKickPrizeSequence> {
    const stepRows = await this.db
      .select()
      .from(schema.gamePrizeSequenceSteps)
      .where(eq(schema.gamePrizeSequenceSteps.sequenceId, sequenceRow.id))
      .orderBy(asc(schema.gamePrizeSequenceSteps.stepIndex));

    return {
      id: sequenceRow.id,
      gameType: sequenceRow.gameType as GameType,
      createdAt: sequenceRow.createdAt,
      steps: stepRows.map(toDomainStep),
    };
  }
}

function toDomainStep(row: {
  stepIndex: number;
  won: number;
  prizeAmount: number;
  stakeAmount: number;
}): PenaltyKickPrizeStep {
  return {
    stepIndex: row.stepIndex,
    won: row.won === 1,
    prizeAmount: row.prizeAmount,
    stakeAmount: row.stakeAmount,
  };
}
