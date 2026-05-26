import { WebSocket } from "ws";
import { Redis } from "ioredis";
import { Value } from "@sinclair/typebox/value";
import { GameCommandPort } from "../../../application/ports/inbound/game-command.port";
import { PlayerSessionPort } from "../../../application/ports/outbound/player-session.port";
import { matchEventsChannel } from "../../../infrastructure/outbound/redis-event-publisher";
import { PlayerId } from "../../../domain/player";
import { incomingMessage, IncomingMessage } from "./ws-message.schema";

export interface AuthenticatedSocketContext {
  playerId: PlayerId;
  playerName: string;
}

export class WsGameAdapter {
  constructor(
    private readonly commands: GameCommandPort,
    private readonly sessions: PlayerSessionPort,
    private readonly redis: Redis,
  ) {}

  handleConnection(socket: WebSocket, ctx: AuthenticatedSocketContext): void {
    void this.sessions.markConnected(ctx.playerId);

    let matchSubscriber: Redis | null = null;
    let subscribedMatchId: string | null = null;

    const subscribeToMatch = async (matchId: string) => {
      if (subscribedMatchId === matchId) return;

      if (matchSubscriber) {
        await matchSubscriber.unsubscribe();
        matchSubscriber.disconnect();
      }

      matchSubscriber = this.redis.duplicate();
      const channel = matchEventsChannel(matchId);
      await matchSubscriber.subscribe(channel);
      matchSubscriber.on("message", (_channel, payload) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        socket.send(payload);
      });
      subscribedMatchId = matchId;
    };

    const unsubscribeFromMatch = async () => {
      if (!matchSubscriber) return;
      await matchSubscriber.unsubscribe();
      matchSubscriber.disconnect();
      matchSubscriber = null;
      subscribedMatchId = null;
    };

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
        await this.dispatch(ctx, parsed, subscribeToMatch, unsubscribeFromMatch);
      } catch (err) {
        this.sendError(
          socket,
          err instanceof Error ? err.message : "unknown_error",
        );
      }
    });

    socket.on("close", () => {
      void this.sessions.markDisconnected(ctx.playerId);
      void unsubscribeFromMatch();
    });
  }

  private async dispatch(
    ctx: AuthenticatedSocketContext,
    msg: IncomingMessage,
    subscribeToMatch: (matchId: string) => Promise<void>,
    unsubscribeFromMatch: () => Promise<void>,
  ): Promise<void> {
    switch (msg.type) {
      case "join":
        await this.commands.joinMatch({
          playerId: ctx.playerId,
          playerName: ctx.playerName,
          matchId: msg.matchId,
          gameType: msg.gameType,
        });
        return subscribeToMatch(msg.matchId);
      case "score":
        return this.commands.submitScore({
          playerId: ctx.playerId,
          matchId: msg.matchId,
          gameType: msg.gameType,
          delta: msg.delta,
        });
      case "leave":
        await this.commands.leaveMatch({
          playerId: ctx.playerId,
          matchId: msg.matchId,
          gameType: msg.gameType,
        });
        return unsubscribeFromMatch();
    }
  }

  private sendError(socket: WebSocket, code: string): void {
    socket.send(JSON.stringify({ type: "error", code }));
  }
}
