import { Type, Static } from "@sinclair/typebox";
import { gameTypes } from "../../../domain/game-type";

const gameTypeValues = gameTypes.map((gameType) => Type.Literal(gameType));
export const gameTypeSchema = Type.Union([
  gameTypeValues[0],
  gameTypeValues[1],
  gameTypeValues[2],
]);

export const joinMatchMessage = Type.Object({
  type: Type.Literal("join"),
  matchId: Type.String({ minLength: 1 }),
  gameType: gameTypeSchema,
  sequenceId: Type.Optional(Type.String({ minLength: 1 })),
});

export const submitScoreMessage = Type.Object({
  type: Type.Literal("score"),
  matchId: Type.String({ minLength: 1 }),
  gameType: gameTypeSchema,
  delta: Type.Integer(),
});

export const leaveMatchMessage = Type.Object({
  type: Type.Literal("leave"),
  matchId: Type.String({ minLength: 1 }),
  gameType: gameTypeSchema,
});

export const penaltyKickMessage = Type.Object({
  type: Type.Literal("penalty-kick"),
  matchId: Type.String({ minLength: 1 }),
  gameType: Type.Literal("penalty-kicks"),
  directionIndex: Type.Integer({ minimum: 0, maximum: 3 }),
});

export const incomingMessage = Type.Union([
  joinMatchMessage,
  submitScoreMessage,
  penaltyKickMessage,
  leaveMatchMessage,
]);

export type IncomingMessage = Static<typeof incomingMessage>;
