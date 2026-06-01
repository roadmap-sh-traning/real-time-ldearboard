import fp from "fastify-plugin";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";
import {
  describeDatabaseTarget,
  getDatabasePoolConfig,
  resolveDatabaseUrl,
} from "../config/database";

export default fp(async (fastify) => {
  if (fastify.hasDecorator("db")) {
    return;
  }

  const connectionString = resolveDatabaseUrl();
  const poolConfig = getDatabasePoolConfig();

  fastify.log.info(
    `Connecting to Postgres at ${describeDatabaseTarget(connectionString)} (ssl=${String(poolConfig.ssl)})`,
  );

  const pool = new Pool(poolConfig);

  pool.on("error", (error) => {
    fastify.log.error(error, "Postgres pool error");
  });

  const db = drizzle(pool, { schema });

  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
