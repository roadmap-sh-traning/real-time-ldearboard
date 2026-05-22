export interface ScoreStorePort {
  getLeaderboard(): Promise<
    Array<{ playerId: string; score: number; rank: number }>
  >;
  saveScore(playerId: string, score: number): Promise<void>;
  currentUser(
    playerId: string,
  ): Promise<{ rank: number | null; score: number | null }>;
}
