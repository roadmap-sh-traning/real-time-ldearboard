import { JWT } from "@fastify/jwt";
import {
  FastifyInstance,
  RawServerDefault,
  FastifyRawRequest,
  FastifyRawReply,
  FastifyBaseLogger,
} from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
declare module "fastify" {
  interface FastifyTypeProviderDefault extends TypeBoxTypeProvider {}

  interface FastifyInstance {
    db: NodePgDatabase<typeof schema>;
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    jwt: JWT;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  FastifyRawRequest,
  FastifyRawReply,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;
