import { test } from "node:test";
import * as assert from "node:assert/strict";
import { Value } from "@sinclair/typebox/value";
import { GameService } from "../../../src/feature/game/application/services/game.service";
import { GameCommandPort } from "../../../src/feature/game/application/ports/inbound/game-command.port";
import { EventPublisher } from "../../../src/feature/game/application/ports/outbound/event-publisher.port";
import { MatchRepository } from "../../../src/feature/game/application/ports/outbound/match.repository";
import { PlayerRepository } from "../../../src/feature/game/application/ports/outbound/player.repository";
import { ScoreEventRepository } from "../../../src/feature/game/application/ports/outbound/score-event.repository";
import { GameEvent } from "../../../src/feature/game/domain/events";
import { Match } from "../../../src/feature/game/domain/match";
import { Player, PlayerId } from "../../../src/feature/game/domain/player";
import { ScoreEventRecord } from "../../../src/feature/game/domain/score-event";
import { incomingMessage } from "../../../src/feature/game/infrastructure/inbound/websocket/ws-message.schema";

class InMemoryPlayerRepository implements PlayerRepository {
  private readonly players = new Map<PlayerId, Player>();

  async findById(id: PlayerId): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async save(player: Player): Promise<void> {
    this.players.set(player.id, player);
  }
}

class InMemoryMatchRepository implements MatchRepository {
  private readonly matches = new Map<string, Match>();

  async findById(id: string): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, match);
  }

  set(match: Match): void {
    this.matches.set(match.id, match);
  }
}

class InMemoryScoreEventRepository implements ScoreEventRepository {
  readonly events: ScoreEventRecord[] = [];

  async append(event: ScoreEventRecord): Promise<void> {
    this.events.push(event);
  }
}

class RecordingEventPublisher implements EventPublisher {
  readonly events: GameEvent[] = [];

  publish(event: GameEvent): void {
    this.events.push(event);
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

test("joinMatch carries gameType into matches and events", async () => {
  const players = new InMemoryPlayerRepository();
  const matches = new InMemoryMatchRepository();
  const scoreEvents = new InMemoryScoreEventRepository();
  const eventPublisher = new RecordingEventPublisher();
  const service: GameCommandPort = new GameService(
    players,
    matches,
    scoreEvents,
    eventPublisher,
  );

  await service.joinMatch({
    playerId: 7,
    playerName: "alice@example.com",
    matchId: "match-1",
    gameType: "score",
  });

  const match = await matches.findById("match-1");
  assert.equal(match?.gameType, "score");
  assert.deepEqual(match ? [...match.playerIds] : [], [7]);
  assert.equal(eventPublisher.events[0]?.type, "player.joined");
  assert.equal(eventPublisher.events[0]?.gameType, "score");
});

test("submitScore stores and publishes typed score updates", async () => {
  const players = new InMemoryPlayerRepository();
  await players.save({ id: 7, name: "alice@example.com", score: 0 });

  const matches = new InMemoryMatchRepository();
  matches.set({
    id: "match-1",
    gameType: "score",
    status: "waiting",
    playerIds: new Set([7]),
  });

  const scoreEvents = new InMemoryScoreEventRepository();
  const eventPublisher = new RecordingEventPublisher();
  const service: GameCommandPort = new GameService(
    players,
    matches,
    scoreEvents,
    eventPublisher,
  );

  await service.submitScore({
    playerId: 7,
    matchId: "match-1",
    gameType: "score",
    delta: 3,
  });

  assert.deepEqual(scoreEvents.events[0], {
    userId: 7,
    matchId: "match-1",
    gameType: "score",
    delta: 3,
    scoreAfter: 3,
  });
  assert.equal(eventPublisher.events[0]?.type, "score.updated");
  assert.equal(eventPublisher.events[0]?.gameType, "score");
});

test("incoming websocket messages require a supported gameType", () => {
  assert.equal(
    Value.Check(incomingMessage, {
      type: "join",
      matchId: "match-1",
    }),
    false,
  );
  assert.equal(
    Value.Check(incomingMessage, {
      type: "join",
      matchId: "match-1",
      gameType: "spin-wheel",
    }),
    true,
  );
  assert.equal(
    Value.Check(incomingMessage, {
      type: "score",
      matchId: "match-1",
      gameType: "coin-flip",
      delta: 2,
    }),
    false,
  );
  assert.equal(
    Value.Check(incomingMessage, {
      type: "leave",
      matchId: "match-1",
      gameType: "penalty-kicks",
    }),
    true,
  );
});
