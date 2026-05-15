import createError from "http-errors";

export const AUTH_ERROR = {
  INVALID_CREDENTIALS: createError(401, "Invalid credentials"),
  UNAUTHORIZED: createError(401, "Unauthorized"),
};
