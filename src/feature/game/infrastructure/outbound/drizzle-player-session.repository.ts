import { and, eq, isNull } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { PlayerSessionPort } from "../../application/ports/outbound/player-session.port";
import { PlayerId } from "../../domain/player";

export class DrizzlePlayerSessionRepository implements PlayerSessionPort {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async markConnected(playerId: PlayerId): Promise<void> {
    await this.db
      .insert(schema.playerSessions)
      .values({
        userId: playerId,
        connectedAt: new Date(),
        disconnectedAt: null,
      })
      .onConflictDoUpdate({
        target: schema.playerSessions.userId,
        set: {
          connectedAt: new Date(),
          disconnectedAt: null,
        },
      });
  }

  async markDisconnected(playerId: PlayerId): Promise<void> {
    await this.db
      .update(schema.playerSessions)
      .set({ disconnectedAt: new Date() })
      .where(eq(schema.playerSessions.userId, playerId));
  }

  async isConnected(playerId: PlayerId): Promise<boolean> {
    const [row] = await this.db
      .select({ userId: schema.playerSessions.userId })
      .from(schema.playerSessions)
      .where(
        and(
          eq(schema.playerSessions.userId, playerId),
          isNull(schema.playerSessions.disconnectedAt),
        ),
      )
      .limit(1);

    return row !== undefined;
  }
}
