import { RankedScore } from "../../../domain/ranked-score";
import { ScoreUpdate } from "../../../domain/score-update";

export interface ScoreStorePort {
  getLeaderboard(): Promise<RankedScore[]>;
  updateMany(updates: ScoreUpdate[]): Promise<void>;
  currentUser(
    playerId: string,
  ): Promise<{ rank: number | null; score: number | null }>;
}
