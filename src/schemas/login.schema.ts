import { Type, Static } from "@sinclair/typebox";

export const loginSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String(),
});

export const loginResponseSchema = Type.Object({
  refreshToken: Type.String(),
  accessToken: Type.String(),
});

export type LoginBody = Static<typeof loginSchema>;
export type LoginResponse = Static<typeof loginResponseSchema>;
