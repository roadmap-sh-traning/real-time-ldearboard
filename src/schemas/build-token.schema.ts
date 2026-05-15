import { Type, Static } from "@sinclair/typebox";

export const buildTokenSchema = Type.Object({
  refreshToken: Type.String(),
  accessToken: Type.String(),
  hashedRefreshToken: Type.String(),
  jti: Type.String(),
});

export type BuildTokenBody = Static<typeof buildTokenSchema>;
