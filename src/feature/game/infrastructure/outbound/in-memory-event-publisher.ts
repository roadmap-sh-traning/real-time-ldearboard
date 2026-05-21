import { EventEmitter } from "node:events";
import { GameEvent } from "../../domain/events";
import {
  EventListener,
  EventPublisher,
} from "../../application/ports/outbound/event-publisher.port";

const CHANNEL = "game.event";

export class InMemoryEventPublisher implements EventPublisher {
  private readonly emitter = new EventEmitter();

  publish(event: GameEvent): void {
    this.emitter.emit(CHANNEL, event);
  }

  subscribe(listener: EventListener): () => void {
    this.emitter.on(CHANNEL, listener);
    return () => this.emitter.off(CHANNEL, listener);
  }
}
