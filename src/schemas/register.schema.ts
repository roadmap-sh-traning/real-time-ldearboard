import { Type, Static } from "@sinclair/typebox";

export const registerShema = Type.Object({
  email: Type.String(),
  password: Type.String(),
  name: Type.String(),
});

export const registerResponseSchema = Type.Object({
  refreshToken: Type.String(),
  accessToken: Type.String(),
});

export type RegisterSchema = Static<typeof registerShema>;
