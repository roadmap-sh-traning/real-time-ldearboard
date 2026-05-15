import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    TypeProvider: import("@fastify/type-provider-typebox").TypeBoxTypeProvider;
    db: NodePgDatabase<typeof schema>;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
