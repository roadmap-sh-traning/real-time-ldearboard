export const gameTypes = ["score", "spin-wheel", "penalty-kicks"] as const;

export type GameType = (typeof gameTypes)[number];
