export interface LeaderboardBroadcasterPort {
  broadcastLeaderboard(): Promise<void>;
}
