import createError from "http-errors";

export const AUTH_ERROR = {
  INVALID_CREDENTIALS: createError(401, "Invalid credentials"),
  UNAUTHORIZED: createError(401, "Unauthorized"),
  EMAIL_ALREADY_EXISTS: createError(409, "Email already exists"),
  EMAIL_OR_PASSWORD: createError(401, "Email or password is incorrect"),
  REFRESH_TOKEN_EXPIRED: createError(401, "Refresh token expired"),
  INVALID_PASSWORD: createError(401, "Invalid password"),
  USER_NOT_FOUND: createError(404, "User not found"),
  REFRESH_TOKEN_INVALID: createError(401, "Refresh token invalid"),
  REFRESH_TOKEN_REUSED: createError(401, "Refresh token reused"),
};
