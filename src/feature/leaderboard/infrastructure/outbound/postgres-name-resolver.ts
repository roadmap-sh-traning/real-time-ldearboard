import { inArray } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../../../schema";
import { NameResolverPort } from "../../application/ports/outbound/name-resolver.port";

export class PostgresNameResolver implements NameResolverPort {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async resolveMany(userIds: number[]): Promise<Map<number, string>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(inArray(schema.users.id, userIds));

    return new Map(rows.map((row) => [row.id, row.name]));
  }
}
