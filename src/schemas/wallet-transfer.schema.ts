import { Type, Static } from "@sinclair/typebox";

export const walletTransferBodySchema = Type.Object({
  userId: Type.Integer({ minimum: 1 }),
  amount: Type.Integer({ minimum: 1 }),
  direction: Type.Union([
    Type.Literal("main-to-game"),
    Type.Literal("game-to-main"),
  ]),
  gameType: Type.Optional(Type.Literal("penalty-kicks")),
  reference: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
});

export const walletBalancesResponseSchema = Type.Object({
  userId: Type.Integer(),
  gameType: Type.String(),
  mainBalance: Type.Integer(),
  gameBalance: Type.Integer(),
});

export const walletTransferResponseSchema = Type.Object({
  userId: Type.Integer(),
  gameType: Type.String(),
  amount: Type.Integer(),
  direction: Type.String(),
  mainBalance: Type.Integer(),
  gameBalance: Type.Integer(),
  reference: Type.String(),
});

export type WalletTransferBody = Static<typeof walletTransferBodySchema>;
export type WalletBalancesResponse = Static<typeof walletBalancesResponseSchema>;
export type WalletTransferResponse = Static<typeof walletTransferResponseSchema>;
