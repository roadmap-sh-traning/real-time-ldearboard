import { AppInstance } from "../../../../global";
import { RankedScore } from "../../domain/ranked-score";
import { ScoreUpdate } from "../../domain/score-update";
import { ScoreStorePort } from "../../application/ports/outbound/score-store.port";

const LEADERBOARD_KEY = "leaderboard:global";

export class RedisScoreStore implements ScoreStorePort {
  private client: AppInstance;

  constructor(client: AppInstance) {
    this.client = client;
  }

  async updateMany(updates: ScoreUpdate[]): Promise<void> {
    if (updates.length === 0) return;

    const pipeline = this.client.redis.pipeline();
    for (const { playerId, score } of updates) {
      pipeline.zadd(LEADERBOARD_KEY, score, playerId);
    }
    await pipeline.exec();
  }

  async getLeaderboard(): Promise<RankedScore[]> {
    const result = await this.client.redis.zrevrange(
      LEADERBOARD_KEY,
      0,
      99,
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
    const rank = await this.client.redis.zrevrank(LEADERBOARD_KEY, playerId);

    const score = await this.client.redis.zscore(LEADERBOARD_KEY, playerId);

    return {
      rank: rank !== null ? rank + 1 : null,
      score: score !== null ? Number(score) : null,
    };
  }
}
