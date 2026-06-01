import { Type, Static } from "@sinclair/typebox";

export const walletCreditBodySchema = Type.Object({
  userId: Type.Integer({ minimum: 1 }),
  amount: Type.Integer({ minimum: 1 }),
  reference: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
});

export const walletCreditResponseSchema = Type.Object({
  userId: Type.Integer(),
  amount: Type.Integer(),
  mainBalance: Type.Integer(),
  reference: Type.String(),
});

export type WalletCreditBody = Static<typeof walletCreditBodySchema>;
export type WalletCreditResponse = Static<typeof walletCreditResponseSchema>;
