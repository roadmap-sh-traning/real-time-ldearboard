import { LeaderboardEntry } from "./leaderboard-entry";

export interface LeaderboardSnapshot {
  entries: LeaderboardEntry[];
  updatedAt: string;
}
