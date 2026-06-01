import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import { AppInstance } from "../../global";

/**
 * Loaded by @fastify/autoload with prefix `/penalty` (from the folder name).
 * Route paths here must be relative to that prefix, not `/penalty/...` again.
 */
export default async function penaltyClientRoutes(fs: AppInstance) {
  const root = join(process.cwd(), "public", "penalty");
  const indexPath = join(root, "index.html");

  if (!existsSync(indexPath)) {
    fs.log.warn(
      "Penalty client not built — run: npm run client:build (from repo root)",
    );
  }

  await fs.register(fastifyStatic, {
    root,
    prefix: "/",
    decorateReply: false,
    index: false,
  });

  fs.get("/", async (_request, reply) => {
    if (!existsSync(indexPath)) {
      return reply.status(503).send({
        message:
          "Penalty client missing. Build with: npm run client:build (from repo root)",
      });
    }
    const html = await readFile(indexPath, "utf8");
    return reply.type("text/html; charset=utf-8").send(html);
  });

  fs.get("/favicon.ico", async (_request, reply) => {
    const iconPath = join(root, "favicon.ico");
    if (!existsSync(iconPath)) {
      return reply.status(204).send();
    }
    return reply.send(createReadStream(iconPath));
  });
}
