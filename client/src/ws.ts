import { wsUrl } from "./api";
import type { GameServerEvent, LeaderboardSnapshot } from "./types";

export type GameEventHandler = (event: GameServerEvent) => void;
export type LeaderboardHandler = (snapshot: LeaderboardSnapshot) => void;

export class GameSocket {
  private ws: WebSocket | null = null;

  connect(token: string, onEvent: GameEventHandler, onStatus: (connected: boolean) => void): void {
    this.disconnect();
    this.ws = new WebSocket(wsUrl("/ws/game", token));

    this.ws.onopen = () => onStatus(true);
    this.ws.onclose = () => onStatus(false);
    this.ws.onerror = () => onStatus(false);
    this.ws.onmessage = (ev) => {
      try {
        onEvent(JSON.parse(String(ev.data)) as GameServerEvent);
      } catch {
        onEvent({ type: "WS_ERROR", code: "invalid_json" });
      }
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  send(payload: object): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Game socket is not connected");
    }
    this.ws.send(JSON.stringify(payload));
  }

  joinPenaltyMatch(matchId: string, sequenceId: string): void {
    this.send({
      type: "join",
      matchId,
      gameType: "penalty-kicks",
      sequenceId,
    });
  }

  kick(matchId: string, directionIndex: number): void {
    this.send({
      type: "penalty-kick",
      matchId,
      gameType: "penalty-kicks",
      directionIndex,
    });
  }

  leave(matchId: string): void {
    this.send({
      type: "leave",
      matchId,
      gameType: "penalty-kicks",
    });
  }
}

export type LeaderboardConnectionStatus = "connected" | "disconnected" | "error";

export class LeaderboardSocket {
  private ws: WebSocket | null = null;

  connect(
    token: string,
    onSnapshot: LeaderboardHandler,
    onStatus?: (status: LeaderboardConnectionStatus) => void,
  ): void {
    this.disconnect();
    this.ws = new WebSocket(wsUrl("/ws/leaderboard", token));

    this.ws.onopen = () => onStatus?.("connected");
    this.ws.onclose = () => onStatus?.("disconnected");
    this.ws.onerror = () => onStatus?.("error");

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data));
        if (data?.type === "snapshot") {
          onSnapshot(data as LeaderboardSnapshot);
        }
      } catch {
        /* ignore */
      }
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
