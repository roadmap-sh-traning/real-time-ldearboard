import { Type } from "@sinclair/typebox";

export const UserSchema = Type.Object({
  name: Type.String(),
  email: Type.String(),
  password: Type.String(),
  createdAt: Type.String(),
});

export type UserType = typeof UserSchema;
