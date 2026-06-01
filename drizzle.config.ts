import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./src/config/database";

const url = resolveDatabaseUrl();

if (!url) {
  throw new Error(
    "Database URL missing. Set DATABASE_URL or DATABASE_PRIVATE_URL.",
  );
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
});
