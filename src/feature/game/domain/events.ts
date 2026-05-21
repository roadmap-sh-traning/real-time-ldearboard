import { MatchId } from "./match";
import { PlayerId } from "./player";

export type GameEvent =
  | PlayerJoinedMatchEvent
  | PlayerLeftMatchEvent
  | ScoreUpdatedEvent;

export interface PlayerJoinedMatchEvent {
  type: "player.joined";
  matchId: MatchId;
  playerId: PlayerId;
  playerName: string;
  at: Date;
}

export interface PlayerLeftMatchEvent {
  type: "player.left";
  matchId: MatchId;
  playerId: PlayerId;
  at: Date;
}

export interface ScoreUpdatedEvent {
  type: "score.updated";
  matchId: MatchId;
  playerId: PlayerId;
  newScore: number;
  at: Date;
}
