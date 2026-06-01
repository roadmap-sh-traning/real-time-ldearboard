import type {
  AuthTokens,
  PrizeSequenceInfo,
  UploadSequenceResponse,
  WalletBalances,
  WalletCreditResponse,
  WalletTransferResponse,
} from "./types";

const TOKEN_KEY = "penalty-access-token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Numeric user id from JWT `sub` (set after login/register). */
export function getUserIdFromToken(): number | null {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as {
      sub?: number | string;
    };
    const id = payload.sub;
    if (id === undefined || id === null) return null;
    const n = typeof id === "number" ? id : Number(id);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message ?? res.statusText ?? "Request failed",
    );
  }
  return data;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<AuthTokens>(res);
  setStoredToken(data.accessToken);
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthTokens> {
  const res = await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await parseJson<AuthTokens>(res);
  setStoredToken(data.accessToken);
  return data;
}

export async function fetchWalletBalances(
  gameType = "penalty-kicks",
): Promise<WalletBalances> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const res = await fetch(
    `/api/wallet/balances?gameType=${encodeURIComponent(gameType)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseJson<WalletBalances>(res);
}

export async function transferWallet(input: {
  amount: number;
  direction: "main-to-game" | "game-to-main";
  gameType?: string;
  reference?: string;
  /** Defaults to the logged-in user from the JWT. */
  userId?: number;
}): Promise<WalletTransferResponse> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const userId = input.userId ?? getUserIdFromToken();
  if (userId === null) throw new Error("Login required");

  const res = await fetch("/api/wallet/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      amount: input.amount,
      direction: input.direction,
      gameType: input.gameType ?? "penalty-kicks",
      ...(input.reference ? { reference: input.reference } : {}),
    }),
  });
  return parseJson<WalletTransferResponse>(res);
}

export async function creditWallet(input: {
  userId: number;
  amount: number;
  reference?: string;
}): Promise<WalletCreditResponse> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const res = await fetch("/api/wallet/credit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return parseJson<WalletCreditResponse>(res);
}

export async function fetchActivePrizeSequence(): Promise<PrizeSequenceInfo> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const res = await fetch("/api/penalty-kicks/prize-sequence", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson<PrizeSequenceInfo>(res);
}

export async function generatePrizeSequence(input?: {
  stepCount?: number;
  activate?: boolean;
}): Promise<PrizeSequenceInfo> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const res = await fetch("/api/penalty-kicks/prize-sequence/generate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input ?? {}),
  });
  return parseJson<PrizeSequenceInfo>(res);
}

export async function activatePrizeSequence(
  sequenceId: string,
): Promise<PrizeSequenceInfo> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const res = await fetch("/api/penalty-kicks/prize-sequence/active", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sequenceId }),
  });
  return parseJson<PrizeSequenceInfo>(res);
}

export async function uploadPrizeSequence(file: File): Promise<UploadSequenceResponse> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const body = new FormData();
  body.append("file", file);
  const res = await fetch(
    "/api/penalty-kicks/prize-sequence?activate=true",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    },
  );
  return parseJson<UploadSequenceResponse>(res);
}

export function wsUrl(path: string, token: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}${path}?token=${encodeURIComponent(token)}`;
}
