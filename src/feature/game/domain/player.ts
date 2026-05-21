export type PlayerId = number;

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
}

export function createPlayer(id: PlayerId, name: string): Player {
  return { id, name, score: 0 };
}

export function applyScoreDelta(player: Player, delta: number): Player {
  return { ...player, score: player.score + delta };
}
