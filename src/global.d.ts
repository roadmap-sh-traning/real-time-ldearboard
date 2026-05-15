import "fastify";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare module "fastify" {
  interface FastifyInstance {
    TypeProvider: import("@fastify/type-provider-typebox").TypeBoxTypeProvider;
    db: NodePgDatabase<typeof schema>;
  }
}
