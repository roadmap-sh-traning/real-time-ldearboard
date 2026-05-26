import { EventEmitter } from "node:events";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { Redis } from "ioredis";
import { WS_ERROR } from "../../../src/custom-errors/ws";
import { GameCommandPort } from "../../../src/feature/game/application/ports/inbound/game-command.port";
import { PlayerSessionPort } from "../../../src/feature/game/application/ports/outbound/player-session.port";
import { WsGameAdapter } from "../../../src/feature/game/infrastructure/inbound/websocket/ws-game.adapter";

class FakeSocket extends EventEmitter {
  readonly sent: string[] = [];
  readyState = 1;

  send(payload: string): void {
    this.sent.push(payload);
  }
}

class FakePlayerSessions implements PlayerSessionPort {
  async markConnected(): Promise<void> {}

  async markDisconnected(): Promise<void> {}

  async isConnected(): Promise<boolean> {
    return true;
  }
}

const commands: GameCommandPort = {
  async joinMatch(): Promise<void> {},
  async submitScore(): Promise<void> {},
  async leaveMatch(): Promise<void> {},
};

const redis = {} as Redis;

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

test("invalid JSON emits custom WS_ERROR payload", async () => {
  const adapter = new WsGameAdapter(commands, new FakePlayerSessions(), redis);
  const socket = new FakeSocket();

  adapter.handleConnection(socket as never, {
    playerId: 7,
    playerName: "alice@example.com",
  });

  socket.emit("message", Buffer.from("{"));
  await flush();

  assert.deepEqual(JSON.parse(socket.sent[0] ?? ""), WS_ERROR.INVALID_JSON);
});

test("invalid websocket messages emit custom WS_ERROR payload", async () => {
  const adapter = new WsGameAdapter(commands, new FakePlayerSessions(), redis);
  const socket = new FakeSocket();

  adapter.handleConnection(socket as never, {
    playerId: 7,
    playerName: "alice@example.com",
  });

  socket.emit("message", Buffer.from(JSON.stringify({ type: "join", matchId: "" })));
  await flush();

  assert.deepEqual(JSON.parse(socket.sent[0] ?? ""), WS_ERROR.INVALID_MESSAGE);
});
