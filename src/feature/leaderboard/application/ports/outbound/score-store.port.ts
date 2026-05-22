import { LeaderboardEntry } from "../../../domain/leaderboard-entry";

export interface ScoreStorePort {
  getLeaderboard(): Promise<LeaderboardEntry[]>;  
  saveScore(playerId: string, score: number): Promise<void>;
  currentUser(
    playerId: string,
  ): Promise<{ rank: number | null; score: number | null }>;
}
