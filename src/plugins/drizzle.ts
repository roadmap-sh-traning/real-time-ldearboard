import fp from "fastify-plugin";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../schema";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default fp(async (fastify) => {
  if (fastify.hasDecorator("db")) {
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString,
  });

  const db = drizzle(pool, { schema });

  fastify.decorate("db", db);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});
