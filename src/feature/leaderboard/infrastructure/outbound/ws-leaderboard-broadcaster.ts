import { WebSocket } from "ws";
import { LeaderboardBroadcasterPort } from "../../application/ports/outbound/leaderboard-broadcaster.port";
import { LeaderboardSnapshot } from "../../domain/leaderboard-snapshot";

export class WsLeaderboardBroadcaster implements LeaderboardBroadcasterPort {
  private readonly subscribers = new Set<WebSocket>();

  subscribe(socket: WebSocket): void {
    this.subscribers.add(socket);
  }

  unsubscribe(socket: WebSocket): void {
    this.subscribers.delete(socket);
  }

  async push(snapshot: LeaderboardSnapshot): Promise<void> {
    const payload = JSON.stringify({
      type: "snapshot",
      entries: snapshot.entries,
      updatedAt: snapshot.updatedAt,
    });

    for (const socket of this.subscribers) {
      if (socket.readyState !== WebSocket.OPEN) {
        this.subscribers.delete(socket);
        continue;
      }
      socket.send(payload);
    }
  }
}
