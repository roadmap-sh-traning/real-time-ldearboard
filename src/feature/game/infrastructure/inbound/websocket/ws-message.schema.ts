import { Type, Static } from "@sinclair/typebox";

export const joinMatchMessage = Type.Object({
  type: Type.Literal("join"),
  matchId: Type.String({ minLength: 1 }),
});

export const submitScoreMessage = Type.Object({
  type: Type.Literal("score"),
  matchId: Type.String({ minLength: 1 }),
  delta: Type.Integer(),
});

export const leaveMatchMessage = Type.Object({
  type: Type.Literal("leave"),
  matchId: Type.String({ minLength: 1 }),
});

export const incomingMessage = Type.Union([
  joinMatchMessage,
  submitScoreMessage,
  leaveMatchMessage,
]);

export type IncomingMessage = Static<typeof incomingMessage>;
