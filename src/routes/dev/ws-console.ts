import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AppInstance } from "../../global";

export default async function wsConsoleRoutes(fs: AppInstance) {
  const htmlPath = join(process.cwd(), "public", "ws-console.html");

  fs.get("/ws", async (_request, reply) => {
    const html = await readFile(htmlPath, "utf8");
    return reply.type("text/html; charset=utf-8").send(html);
  });
}
