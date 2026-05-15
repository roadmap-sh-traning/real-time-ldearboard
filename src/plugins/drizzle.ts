import fp from "fastify-plugin";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";

export default fp(async (fastify) => {
  if (fastify.hasDecorator("db")) {
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
