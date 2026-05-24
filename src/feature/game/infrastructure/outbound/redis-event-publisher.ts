import { Redis } from "ioredis";
import { GameEvent } from "../../domain/events";
import {
  EventListener,
  EventPublisher,
} from "../../application/ports/outbound/event-publisher.port";

const GAME_EVENTS_CHANNEL = "events:game";

export function matchEventsChannel(matchId: string): string {
  return `game:match:${matchId}`;
}

export class RedisEventPublisher implements EventPublisher {
  private subscriber: Redis | null = null;
  private readonly listeners = new Set<EventListener>();

  constructor(private readonly redis: Redis) {}

  publish(event: GameEvent): void {
    const payload = JSON.stringify(serializeGameEvent(event));
    void this.redis.publish(GAME_EVENTS_CHANNEL, payload);
    void this.redis.publish(matchEventsChannel(event.matchId), payload);
  }

  subscribe(listener: EventListener): () => void {
    if (!this.subscriber) {
      this.subscriber = this.redis.duplicate();
      void this.subscriber.subscribe(GAME_EVENTS_CHANNEL);
      this.subscriber.on("message", (_channel, payload) => {
        const event = deserializeGameEvent(JSON.parse(payload));
        for (const fn of this.listeners) fn(event);
      });
    }

    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.subscriber) {
        void this.subscriber.unsubscribe(GAME_EVENTS_CHANNEL);
        this.subscriber.disconnect();
        this.subscriber = null;
      }
    };
  }
}

function serializeGameEvent(event: GameEvent): GameEvent {
  return { ...event, at: event.at.toISOString() } as unknown as GameEvent;
}

function deserializeGameEvent(raw: GameEvent & { at: string | Date }): GameEvent {
  return { ...raw, at: new Date(raw.at) };
}
