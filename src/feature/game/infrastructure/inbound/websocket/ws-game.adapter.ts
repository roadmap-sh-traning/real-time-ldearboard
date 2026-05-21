import { WebSocket } from "ws";
import { Value } from "@sinclair/typebox/value";
import { GameCommandPort } from "../../../application/ports/inbound/game-command.port";
import { EventPublisher } from "../../../application/ports/outbound/event-publisher.port";
import { PlayerId } from "../../../domain/player";
import { WsConnectionRegistry } from "./ws-connection-registry";
import { incomingMessage, IncomingMessage } from "./ws-message.schema";

export interface AuthenticatedSocketContext {
  playerId: PlayerId;
  playerName: string;
}

export class WsGameAdapter {
  constructor(
    private readonly commands: GameCommandPort,
    private readonly registry: WsConnectionRegistry,
    private readonly events: EventPublisher,
  ) {
    this.events.subscribe((event) => {
      const payload = JSON.stringify(event);
      for (const pid of this.registry.playersInMatch(event.matchId)) {
        this.registry.socketFor(pid)?.send(payload);
      }
    });
  }

  handleConnection(socket: WebSocket, ctx: AuthenticatedSocketContext): void {
    this.registry.attach(ctx.playerId, socket);

    socket.on("message", async (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return this.sendError(socket, "invalid_json");
      }

      if (!Value.Check(incomingMessage, parsed)) {
        return this.sendError(socket, "invalid_message");
      }

      try {
        await this.dispatch(ctx, parsed);
      } catch (err) {
        this.sendError(
          socket,
          err instanceof Error ? err.message : "unknown_error",
        );
      }
    });

    socket.on("close", () => {
      this.registry.detach(ctx.playerId);
    });
  }

  private async dispatch(
    ctx: AuthenticatedSocketContext,
    msg: IncomingMessage,
  ): Promise<void> {
    switch (msg.type) {
      case "join":
        return this.commands.joinMatch({
          playerId: ctx.playerId,
          playerName: ctx.playerName,
          matchId: msg.matchId,
        });
      case "score":
        return this.commands.submitScore({
          playerId: ctx.playerId,
          matchId: msg.matchId,
          delta: msg.delta,
        });
      case "leave":
        return this.commands.leaveMatch({
          playerId: ctx.playerId,
          matchId: msg.matchId,
        });
    }
  }

  private sendError(socket: WebSocket, code: string): void {
    socket.send(JSON.stringify({ type: "error", code }));
  }
}
