import createError from "http-errors";

export const AUTH_ERROR = {
  INVALID_CREDENTIALS: createError(401, "Invalid credentials"),
  UNAUTHORIZED: createError(401, "Unauthorized"),
  EMAIL_ALREADY_EXISTS: createError(409, "Email already exists"),
  REFRESH_TOKEN_EXPIRED: createError(401, "Refresh token expired"),
  INVALID_PASSWORD: createError(401, "Invalid password"),
};
