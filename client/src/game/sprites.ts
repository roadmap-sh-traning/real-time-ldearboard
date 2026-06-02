/** Sprite sheet paths (relative to Vite base URL). */
export const SPRITE_ASSETS = {
  pitch: "sprites/pitch.png",
  goal: "sprites/goal.png",
  keeper: "sprites/keeper.json",
  ball: "sprites/ball.json",
  shooter: "sprites/shooter.json",
  goalBurst: "sprites/goal-burst.json",
} as const;

// Rendered penalty sheets: keeper frames are 100x200 (idle) / 300x200 (dive),
// ball frames 28x28. KEEPER_FRAME_SIZE feeds the layout scale formula
// `(goalW/4)/(KEEPER_FRAME_SIZE*0.9)`; 300 (the dive frame width) keeps the
// 200px-tall keeper roughly goal-height on screen instead of oversized.
export const KEEPER_FRAME_SIZE = 300;
export const BALL_FRAME_SIZE = 28;
export const GOAL_BURST_SIZE = 64;
// Shooter (penalty taker) frames: 150x250 idle / 350x350 shoot. Reference
// height used to scale the foreground shooter relative to canvas height.
export const SHOOTER_FRAME_SIZE = 250;
