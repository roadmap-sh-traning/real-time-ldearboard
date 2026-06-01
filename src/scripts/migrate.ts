import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import {
  describeDatabaseTarget,
  getDatabasePoolConfig,
  resolveDatabaseUrl,
} from "../config/database";

async function main(): Promise<void> {
  const connectionString = resolveDatabaseUrl();
  console.log(
    `Running migrations against ${describeDatabaseTarget(connectionString)}`,
  );

  const pool = new Pool(getDatabasePoolConfig());
  const db = drizzle(pool);

  const migrationsFolder = path.join(__dirname, "..", "..", "drizzle");

  await migrate(db, { migrationsFolder });
  await pool.end();

  console.log("Migrations complete");
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
