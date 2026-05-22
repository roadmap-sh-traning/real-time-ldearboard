import { LeaderboardSnapshot } from "../../../domain/leaderboard-snapshot";

export interface LeaderboardBroadcasterPort {
  push(snapshot: LeaderboardSnapshot): Promise<void>;
}
