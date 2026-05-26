import { PlayerId } from "./player";
import { GameType } from "./game-type";

export type MatchId = string;

export type MatchStatus = "waiting" | "active" | "ended";

export interface Match {
  id: MatchId;
  gameType: GameType;
  status: MatchStatus;
  playerIds: Set<PlayerId>;
  startedAt?: Date;
  endedAt?: Date;
}

export function createMatch(id: MatchId, gameType: GameType): Match {
  return { id, gameType, status: "waiting", playerIds: new Set() };
}

export function addPlayer(match: Match, playerId: PlayerId): Match {
  if (match.status === "ended") {
    throw new Error("Cannot join an ended match");
  }
  const playerIds = new Set(match.playerIds);
  playerIds.add(playerId);
  return { ...match, playerIds };
}

export function removePlayer(match: Match, playerId: PlayerId): Match {
  const playerIds = new Set(match.playerIds);
  playerIds.delete(playerId);
  return { ...match, playerIds };
}
