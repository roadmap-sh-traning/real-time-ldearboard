import { URL } from "node:url";
import type { RedisOptions } from "ioredis";

const sharedOptions: Pick<RedisOptions, "connectTimeout" | "maxRetriesPerRequest"> =
  {
    connectTimeout: 10_000,
    maxRetriesPerRequest: 3,
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
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(parsed.username && parsed.username !== "default"
      ? { username: decodeURIComponent(parsed.username) }
      : {}),
    ...(tls ? { tls: {} } : {}),
  };
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
    return optionsFromUrl(url);
  }

  return {
    ...sharedOptions,
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : {}),
  };
}
