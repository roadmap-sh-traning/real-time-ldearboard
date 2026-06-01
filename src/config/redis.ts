import { URL } from "node:url";
import type { RedisOptions } from "ioredis";

/** Required for Railway private network (dual-stack DNS). See railway.com/docs/databases/troubleshooting/enotfound-redis-railway-internal */
const RAILWAY_FAMILY: RedisOptions["family"] = 0;

const sharedOptions: Pick<
  RedisOptions,
  "connectTimeout" | "maxRetriesPerRequest" | "family"
> = {
  connectTimeout: 10_000,
  maxRetriesPerRequest: 3,
  family: RAILWAY_FAMILY,
};

function optionsFromUrl(connectionUrl: string): RedisOptions {
  const parsed = new URL(connectionUrl);
  const tls = parsed.protocol === "rediss:";

  return {
    ...sharedOptions,
    host: parsed.hostname,
    port: parsed.port
      ? Number(parsed.port)
      : tls
        ? 6380
        : 6379,
    ...(parsed.password
      ? { password: decodeURIComponent(parsed.password) }
      : {}),
    ...(parsed.username
      ? { username: decodeURIComponent(parsed.username) }
      : {}),
    ...(tls ? { tls: {} } : {}),
  };
}

function optionsFromRailwayParts(): RedisOptions | null {
  const host =
    process.env.REDISHOST?.trim() ||
    process.env.REDIS_HOST?.trim();

  if (!host) {
    return null;
  }

  return {
    ...sharedOptions,
    host,
    port: Number(process.env.REDISPORT || process.env.REDIS_PORT) || 6379,
    ...(process.env.REDISPASSWORD || process.env.REDIS_PASSWORD
      ? {
          password:
            process.env.REDISPASSWORD || process.env.REDIS_PASSWORD,
        }
      : {}),
    ...(process.env.REDISUSER
      ? { username: process.env.REDISUSER }
      : {}),
  };
}

function assertRedisConfigured(options: RedisOptions): void {
  const host = options.host ?? "localhost";
  const isLocal = host === "localhost" || host === "127.0.0.1";

  if (process.env.NODE_ENV === "production" && isLocal) {
    throw new Error(
      "Redis is not configured for production. On Railway: add a Redis service, " +
        "reference REDIS_URL (or REDISHOST/REDISPASSWORD) on the app service, " +
        "and remove REDIS_HOST=127.0.0.1.",
    );
  }
}

/** Safe log line (no secrets). */
export function describeRedisTarget(options: RedisOptions): string {
  const host = options.host ?? "(url)";
  const port = options.port ?? 6379;
  const auth = options.password ? "with password" : "no password";
  return `${host}:${port} (${auth}, family=${options.family ?? "default"})`;
}

/**
 * Redis connection for @fastify/redis / ioredis.
 * Prefer REDIS_URL (Railway, Render, Upstash) when deploying; use REDIS_HOST locally.
 */
export function getRedisOptions(): RedisOptions {
  const url =
    process.env.REDIS_URL?.trim() ||
    process.env.REDIS_PRIVATE_URL?.trim();

  if (url) {
    const options = optionsFromUrl(url);
    assertRedisConfigured(options);
    return options;
  }

  const railwayParts = optionsFromRailwayParts();
  if (railwayParts) {
    assertRedisConfigured(railwayParts);
    return railwayParts;
  }

  const fallback: RedisOptions = {
    ...sharedOptions,
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : {}),
  };

  assertRedisConfigured(fallback);
  return fallback;
}
