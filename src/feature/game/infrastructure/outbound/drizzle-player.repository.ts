import { eq, sql } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { Player, PlayerId } from "../../domain/player";
import { PlayerRepository } from "../../application/ports/outbound/player.repository";

export class DrizzlePlayerRepository implements PlayerRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: PlayerId): Promise<Player | undefined> {
    const [row] = await this.db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        score: sql<number>`coalesce(${schema.PlayerScores.score}, 0)`.mapWith(
          Number,
        ),
      })
      .from(schema.users)
      .leftJoin(
        schema.PlayerScores,
        eq(schema.users.id, schema.PlayerScores.userId),
      )
      .where(eq(schema.users.id, id))
      .limit(1);

    if (!row) return undefined;

    return { id: row.id, name: row.name, score: row.score };
  }

  async save(player: Player): Promise<void> {
    if (player.score === 0) return;

    await this.db
      .insert(schema.PlayerScores)
      .values({
        userId: player.id,
        score: player.score,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.PlayerScores.userId,
        set: {
          score: player.score,
          updatedAt: new Date(),
        },
      });
  }
}
