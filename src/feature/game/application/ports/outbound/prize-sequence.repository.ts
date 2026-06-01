import { GameType } from "../../../domain/game-type";
import { MatchId } from "../../../domain/match";
import { PlayerId } from "../../../domain/player";
import {
  PenaltyKickPrizeSequence,
  PenaltyKickProgress,
  PrizeSequenceId,
} from "../../../domain/penalty-kick-prize-sequence";

export interface PrizeSequenceRepository {
  getSequenceById(
    sequenceId: PrizeSequenceId,
  ): Promise<PenaltyKickPrizeSequence | undefined>;
  getActiveSequence(gameType: GameType): Promise<PenaltyKickPrizeSequence | undefined>;
  saveSequence(sequence: PenaltyKickPrizeSequence): Promise<void>;
  replaceActiveSequence(sequence: PenaltyKickPrizeSequence): Promise<void>;
  activateSequence(
    sequenceId: PrizeSequenceId,
    gameType: GameType,
  ): Promise<void>;
  getProgress(input: {
    userId: PlayerId;
    matchId: MatchId;
  }): Promise<PenaltyKickProgress | undefined>;
  resetProgress(progress: PenaltyKickProgress): Promise<void>;
  advanceProgress(input: {
    userId: PlayerId;
    matchId: MatchId;
  }): Promise<PenaltyKickProgress>;
}

export type { PrizeSequenceId };
