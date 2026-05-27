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

export function resolvePenaltyKickOutcome(
  step: PenaltyKickPrizeStep,
): { won: boolean; amount: number } {
  if (step.won) {
    return { won: true, amount: step.prizeAmount };
  }

  return { won: false, amount: step.stakeAmount };
}
