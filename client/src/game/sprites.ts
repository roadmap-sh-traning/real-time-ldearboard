/** Sprite sheet paths (relative to Vite base URL). */
export const SPRITE_ASSETS = {
  pitch: "sprites/pitch.png",
  keeper: "sprites/keeper.json",
  ball: "sprites/ball.json",
  goalBurst: "sprites/goal-burst.json",
} as const;

export const KEEPER_FRAME_SIZE = 64;
export const BALL_FRAME_SIZE = 32;
export const GOAL_BURST_SIZE = 64;
