import { AppInstance } from "../../../../global";
import { ScoreStorePort } from "../../application/ports/outbound/score-store.port";

export class RedisScoreStore implements ScoreStorePort {
  private client: AppInstance;

  constructor(client: AppInstance) {
    this.client = client;
  }

  async saveScore(playerId: string, score: number): Promise<void> {
    this.client.redis.zincrby("leaderboard", score, playerId);
  }

  async getLeaderboard() {
    const result = await this.client.redis.zrevrange(
      "leaderboard",
      0,
      100,
      "WITHSCORES",
    );

    const formatted = [];

    for (let i = 0; i < result.length; i += 2) {
      formatted.push({
        playerId: result[i] as string,
        score: Number(result[i + 1]),
        rank: i / 2 + 1,
      });
    }

    return formatted;
  }

  async currentUser(playerId: string) {
    const rank = await this.client.redis.zrevrank(
      "leaderboard:global",
      playerId,
    );

    const score = await this.client.redis.zscore(
      "leaderboard:global",
      playerId,
    );

    return {
      rank: rank !== null ? rank + 1 : null,
      score: score !== null ? Number(score) : null,
    };
  }
}
