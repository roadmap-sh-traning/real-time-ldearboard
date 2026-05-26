export const gameTypes = ["spin-wheel", "penalty-kicks"] as const;

export type GameType = (typeof gameTypes)[number];
