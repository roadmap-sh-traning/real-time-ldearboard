import { and, eq, isNull } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { Match, MatchId, MatchStatus } from "../../domain/match";
import { MatchRepository } from "../../application/ports/outbound/match.repository";

export class DrizzleMatchRepository implements MatchRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: MatchId): Promise<Match | undefined> {
    const [matchRow] = await this.db
      .select()
      .from(schema.matches)
      .where(eq(schema.matches.id, id))
      .limit(1);

    if (!matchRow) return undefined;

    const playerRows = await this.db
      .select({ userId: schema.matchTables.userId })
      .from(schema.matchTables)
      .where(
        and(
          eq(schema.matchTables.matchId, id),
          isNull(schema.matchTables.leftAt),
        ),
      );

    return {
      id: matchRow.id,
      status: toDomainStatus(matchRow.status),
      playerIds: new Set(playerRows.map((row) => row.userId)),
      startedAt: matchRow.startedAt ?? undefined,
      endedAt: matchRow.endedAt ?? undefined,
    };
  }

  async save(match: Match): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(schema.matches)
        .values({
          id: match.id,
          status: match.status,
          startedAt: match.startedAt ?? null,
          endedAt: match.endedAt ?? null,
        })
        .onConflictDoUpdate({
          target: schema.matches.id,
          set: {
            status: match.status,
            startedAt: match.startedAt ?? null,
            endedAt: match.endedAt ?? null,
          },
        });

      const activePlayers = await tx
        .select({
          id: schema.matchTables.id,
          userId: schema.matchTables.userId,
        })
        .from(schema.matchTables)
        .where(
          and(
            eq(schema.matchTables.matchId, match.id),
            isNull(schema.matchTables.leftAt),
          ),
        );

      const activeIds = new Set(activePlayers.map((row) => row.userId));

      for (const userId of match.playerIds) {
        if (activeIds.has(userId)) continue;

        await tx.insert(schema.matchTables).values({
          matchId: match.id,
          userId,
          joinedAt: new Date(),
          leftAt: null,
        });
      }

      for (const row of activePlayers) {
        if (match.playerIds.has(row.userId)) continue;

        await tx
          .update(schema.matchTables)
          .set({ leftAt: new Date() })
          .where(eq(schema.matchTables.id, row.id));
      }
    });
  }
}

function toDomainStatus(status: string): MatchStatus {
  if (status === "pending") return "waiting";
  if (status === "waiting" || status === "active" || status === "ended") {
    return status;
  }
  return "waiting";
}
