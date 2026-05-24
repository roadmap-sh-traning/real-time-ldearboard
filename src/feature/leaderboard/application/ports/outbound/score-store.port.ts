import { RankedScore } from "../../../domain/ranked-score";

export interface ScoreStorePort {
  getLeaderboard(): Promise<RankedScore[]>;
  saveScore(playerId: string, score: number): Promise<void>;
  currentUser(
    playerId: string,
  ): Promise<{ rank: number | null; score: number | null }>;
}
