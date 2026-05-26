export const WS_ERROR_TYPE = "WS_ERROR";

export interface WsErrorPayload {
  type: typeof WS_ERROR_TYPE;
  code: string;
}

export const WS_ERROR = {
  INVALID_JSON: {
    type: WS_ERROR_TYPE,
    code: "invalid_json",
  },
  INVALID_MESSAGE: {
    type: WS_ERROR_TYPE,
    code: "invalid_message",
  },
  UNKNOWN_ERROR: {
    type: WS_ERROR_TYPE,
    code: "unknown_error",
  },
} as const satisfies Record<string, WsErrorPayload>;

export function toWsError(code: string): WsErrorPayload {
  const known = Object.values(WS_ERROR).find((error) => error.code === code);
  return known ?? { type: WS_ERROR_TYPE, code };
}
