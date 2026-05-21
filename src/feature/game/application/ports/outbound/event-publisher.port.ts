import { GameEvent } from "../../../domain/events";

export type EventListener = (event: GameEvent) => void;

export interface EventPublisher {
  publish(event: GameEvent): void;
  subscribe(listener: EventListener): () => void;
}
