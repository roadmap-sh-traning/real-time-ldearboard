import { JWT } from "@fastify/jwt";
import {
  FastifyInstance,
  RawServerDefault,
  FastifyRawRequest,
  FastifyRawReply,
  FastifyBaseLogger,
} from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import "@fastify/jwt";
import { JwtPayload } from "./schemas";
import "@fastify/redis";
import { Redis } from "ioredis";

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

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: number; email: string };
    user: JwtPayload;
  }
}

declare module "fastify" {
  interface FastifyRedis {
    publisher: Redis;
    subscriber: Redis;
  }
}

export type AppInstance = FastifyInstance<
  RawServerDefault,
  FastifyRawRequest,
  FastifyRawReply,
  FastifyBaseLogger,
  TypeBoxTypeProvider
> & {
  redis: Redis;
};
