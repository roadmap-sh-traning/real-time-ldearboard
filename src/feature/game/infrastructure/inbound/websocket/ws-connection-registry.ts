import { WebSocket } from "ws";
import { ConnectionRegistry } from "../../../application/ports/outbound/connection-registry.port";
import { MatchId } from "../../../domain/match";
import { PlayerId } from "../../../domain/player";

export class WsConnectionRegistry implements ConnectionRegistry {
  private readonly socketByPlayer = new Map<PlayerId, WebSocket>();
  private readonly matchByPlayer = new Map<PlayerId, MatchId>();
  private readonly playersByMatch = new Map<MatchId, Set<PlayerId>>();

  attach(playerId: PlayerId, socket: WebSocket): void {
    this.socketByPlayer.set(playerId, socket);
  }

  detach(playerId: PlayerId): void {
    this.socketByPlayer.delete(playerId);
    this.unbind(playerId);
  }

  bind(playerId: PlayerId, matchId: MatchId): void {
    this.matchByPlayer.set(playerId, matchId);
    let set = this.playersByMatch.get(matchId);
    if (!set) {
      set = new Set();
      this.playersByMatch.set(matchId, set);
    }
    set.add(playerId);
  }

  unbind(playerId: PlayerId): void {
    const matchId = this.matchByPlayer.get(playerId);
    if (matchId === undefined) return;
    this.matchByPlayer.delete(playerId);
    const set = this.playersByMatch.get(matchId);
    if (!set) return;
    set.delete(playerId);
    if (set.size === 0) this.playersByMatch.delete(matchId);
  }

  playersInMatch(matchId: MatchId): PlayerId[] {
    return Array.from(this.playersByMatch.get(matchId) ?? []);
  }

  socketFor(playerId: PlayerId): WebSocket | undefined {
    return this.socketByPlayer.get(playerId);
  }
}
