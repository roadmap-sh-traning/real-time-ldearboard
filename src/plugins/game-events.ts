import fp from "fastify-plugin";
import { EventPublisher } from "../feature/game/application/ports/outbound/event-publisher.port";
import { InMemoryEventPublisher } from "../feature/game/infrastructure/outbound/in-memory-event-publisher";

declare module "fastify" {
  interface FastifyInstance {
    gameEvents: EventPublisher;
  }
}

export default fp(async (fastify) => {
  const events = new InMemoryEventPublisher();
  fastify.decorate("gameEvents", events);
});
