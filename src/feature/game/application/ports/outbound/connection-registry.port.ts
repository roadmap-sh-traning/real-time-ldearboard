import { MatchId } from "../../../domain/match";
import { PlayerId } from "../../../domain/player";

export interface ConnectionRegistry {
  bind(playerId: PlayerId, matchId: MatchId): void;
  unbind(playerId: PlayerId): void;
  playersInMatch(matchId: MatchId): PlayerId[];
}
