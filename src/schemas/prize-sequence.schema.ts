import { Type, Static } from "@sinclair/typebox";

export const generateSequenceBodySchema = Type.Object({
  stepCount: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
  activate: Type.Optional(Type.Boolean()),
});

export const activateSequenceBodySchema = Type.Object({
  sequenceId: Type.String({ minLength: 1 }),
});

export const prizeSequenceResponseSchema = Type.Object({
  sequenceId: Type.String(),
  gameType: Type.String(),
  stepCount: Type.Integer(),
  isActive: Type.Optional(Type.Boolean()),
  steps: Type.Array(
    Type.Object({
      stepIndex: Type.Integer(),
      won: Type.Boolean(),
      prizeAmount: Type.Integer(),
      stakeAmount: Type.Integer(),
    }),
  ),
});

export type GenerateSequenceBody = Static<typeof generateSequenceBodySchema>;
export type ActivateSequenceBody = Static<typeof activateSequenceBodySchema>;
