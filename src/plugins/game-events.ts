import fp from "fastify-plugin";
import { EventPublisher } from "../feature/game/application/ports/outbound/event-publisher.port";
import { RedisEventPublisher } from "../feature/game/infrastructure/outbound/redis-event-publisher";

declare module "fastify" {
  interface FastifyInstance {
    gameEvents: EventPublisher;
  }
}

export default fp(async (fastify) => {
  const events = new RedisEventPublisher(fastify.redis);
  fastify.decorate("gameEvents", events);
});
