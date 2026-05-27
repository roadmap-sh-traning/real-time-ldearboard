import { and, eq, inArray, isNull } from "drizzle-orm";
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
      gameType: matchRow.gameType as Match["gameType"],
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
          gameType: match.gameType,
          status: match.status,
          startedAt: match.startedAt ?? null,
          endedAt: match.endedAt ?? null,
        })
        .onConflictDoUpdate({
          target: schema.matches.id,
          set: {
            gameType: match.gameType,
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

      const values = [...match.playerIds]
        .filter((userId) => !activeIds.has(userId))
        .map((userId) => ({
          matchId: match.id,
          userId,
          joinedAt: new Date(),
          leftAt: null,
        }));

      if (values.length > 0) {
        await tx.insert(schema.matchTables).values(values);
      }

      const updateMatchTableIds = activePlayers
        .filter((player) => !match.playerIds.has(player.userId))
        .map((p) => p.id);

      if (updateMatchTableIds.length > 0) {
        await tx
          .update(schema.matchTables)
          .set({ leftAt: new Date() })
          .where(inArray(schema.matchTables.id, updateMatchTableIds));
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
