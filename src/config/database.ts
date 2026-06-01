import dns from "node:dns";
import { URL } from "node:url";
import type { PoolConfig } from "pg";

export function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_PRIVATE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

function assertDatabaseConfigured(connectionString: string): void {
  let host = "unknown";
  try {
    host = new URL(connectionString).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  const isLocal = host === "localhost" || host === "127.0.0.1";

  if (process.env.NODE_ENV === "production" && isLocal) {
    throw new Error(
      "DATABASE_URL points at localhost. On Railway: reference Postgres " +
        "DATABASE_URL or DATABASE_PRIVATE_URL on the app service and remove 127.0.0.1.",
    );
  }
}

export function describeDatabaseTarget(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const db = url.pathname.replace(/^\//, "") || "postgres";
    return `${url.hostname}:${url.port || 5432}/${db}`;
  } catch {
    return "(invalid database URL)";
  }
}

function sslConfigForHost(
  host: string,
  connectionString: string,
): PoolConfig["ssl"] {
  if (host === "localhost" || host === "127.0.0.1") {
    return undefined;
  }

  if (host.endsWith("railway.internal")) {
    return false;
  }

  const sslmode = new URL(connectionString).searchParams.get("sslmode");
  if (sslmode === "disable") {
    return false;
  }

  if (host.includes("rlwy.net") || sslmode === "require" || sslmode === "prefer") {
    return { rejectUnauthorized: false };
  }

  return undefined;
}


export function getDatabasePoolConfig(): PoolConfig {
  const connectionString = resolveDatabaseUrl();

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  assertDatabaseConfigured(connectionString);

  if (connectionString.includes("railway.internal")) {
    dns.setDefaultResultOrder("verbatim");
  }

  const host = new URL(connectionString).hostname;

  return {
    connectionString,
    ssl: sslConfigForHost(host, connectionString),
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: "real-time-leaderboard",
  };
}
