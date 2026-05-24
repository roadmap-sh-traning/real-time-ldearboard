import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { ScoreEventRecord } from "../../domain/score-event";
import { ScoreEventRepository } from "../../application/ports/outbound/score-event.repository";

export class DrizzleScoreEventRepository implements ScoreEventRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async append(event: ScoreEventRecord): Promise<void> {
    await this.db.insert(schema.scoreEvents).values({
      userId: event.userId,
      matchId: event.matchId,
      delta: event.delta,
      scoreAfter: event.scoreAfter,
    });
  }
}
