import type { AuthTokens, UploadSequenceResponse } from "./types";

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

export async function uploadPrizeSequence(file: File): Promise<UploadSequenceResponse> {
  const token = getStoredToken();
  if (!token) throw new Error("Login required");

  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/penalty-kicks/prize-sequence", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  return parseJson<UploadSequenceResponse>(res);
}

export function wsUrl(path: string, token: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}${path}?token=${encodeURIComponent(token)}`;
}
