import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import { AppInstance } from "../../global";

export default async function penaltyClientRoutes(fs: AppInstance) {
  const root = join(process.cwd(), "public", "penalty");
  const indexPath = join(root, "index.html");

  if (!existsSync(indexPath)) {
    fs.log.warn(
      "Penalty client not built — run: cd client && npm install && npm run build",
    );
  }

  await fs.register(fastifyStatic, {
    root,
    prefix: "/penalty/",
    decorateReply: false,
    index: false,
  });

  fs.get("/penalty", (_request, reply) => {
    return reply.redirect("/penalty/");
  });

  fs.get("/penalty/", async (_request, reply) => {
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
