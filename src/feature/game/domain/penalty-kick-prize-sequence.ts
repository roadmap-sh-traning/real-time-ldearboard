import { GameType } from "./game-type";

export type PrizeSequenceId = string;

export interface PenaltyKickPrizeStep {
  stepIndex: number;
  won: boolean;
  prizeAmount: number;
  stakeAmount: number;
}

export interface PenaltyKickPrizeSequence {
  id: PrizeSequenceId;
  gameType: GameType;
  steps: PenaltyKickPrizeStep[];
  createdAt: Date;
}

export interface PenaltyKickProgress {
  userId: number;
  matchId: string;
  sequenceId: PrizeSequenceId;
  nextStepIndex: number;
}

export const DEFAULT_GENERATED_SEQUENCE_STEPS = 100;

export function buildGeneratedPenaltyKickSteps(
  stepCount: number = DEFAULT_GENERATED_SEQUENCE_STEPS,
): PenaltyKickPrizeStep[] {
  if (!Number.isInteger(stepCount) || stepCount < 1 || stepCount > 500) {
    throw new Error("stepCount must be an integer between 1 and 500");
  }

  const steps: PenaltyKickPrizeStep[] = [];

  for (let i = 0; i < stepCount; i++) {
    const won = i % 3 !== 2;
    if (won) {
      steps.push({
        stepIndex: i,
        won: true,
        prizeAmount: 10 + (i % 6) * 5,
        stakeAmount: 0,
      });
    } else {
      steps.push({
        stepIndex: i,
        won: false,
        prizeAmount: 0,
        stakeAmount: 5 + (i % 5) * 5,
      });
    }
  }

  return steps;
}

export function resolvePenaltyKickOutcome(
  step: PenaltyKickPrizeStep,
): { won: boolean; amount: number } {
  if (step.won) {
    return { won: true, amount: step.prizeAmount };
  }

  return { won: false, amount: step.stakeAmount };
}
