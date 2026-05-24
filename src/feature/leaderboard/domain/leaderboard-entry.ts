export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  score: number;
}


export interface CurrentUser {
  rank: number | null;
  score: number | null;
}