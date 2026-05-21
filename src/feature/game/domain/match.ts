import { PlayerId } from "./player";

export type MatchId = string;

export type MatchStatus = "waiting" | "active" | "ended";

export interface Match {
  id: MatchId;
  status: MatchStatus;
  playerIds: Set<PlayerId>;
  startedAt?: Date;
  endedAt?: Date;
}

export function createMatch(id: MatchId): Match {
  return { id, status: "waiting", playerIds: new Set() };
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
