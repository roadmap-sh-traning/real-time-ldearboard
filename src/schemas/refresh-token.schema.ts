import { Type, Static } from "@sinclair/typebox";

export const JwtPayloadSchema = Type.Object({
  sub: Type.Number(),
  jti: Type.String(),
  email: Type.String(),
});

export const RefreshTokenSchema = Type.Object({
  refreshToken: Type.String(),
});

export type JwtPayload = Static<typeof JwtPayloadSchema>;
