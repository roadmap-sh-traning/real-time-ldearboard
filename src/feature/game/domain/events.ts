import { MatchId } from "./match";
import { PlayerId } from "./player";
import { GameType } from "./game-type";

export type GameEvent =
  | PlayerJoinedMatchEvent
  | PlayerLeftMatchEvent
  | ScoreUpdatedEvent;

export interface PlayerJoinedMatchEvent {
  type: "player.joined";
  matchId: MatchId;
  gameType: GameType;
  playerId: PlayerId;
  playerName: string;
  at: Date;
}

export interface PlayerLeftMatchEvent {
  type: "player.left";
  matchId: MatchId;
  gameType: GameType;
  playerId: PlayerId;
  at: Date;
}

export interface ScoreUpdatedEvent {
  type: "score.updated";
  matchId: MatchId;
  gameType: GameType;
  playerId: PlayerId;
  newScore: number;
  at: Date;
}
