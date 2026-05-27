import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import { AppInstance } from "../../global";

export default async function penaltyClientRoutes(fs: AppInstance) {
  const root = join(process.cwd(), "public", "penalty");

  await fs.register(fastifyStatic, {
    root,
    prefix: "/penalty/",
    decorateReply: false,
  });

  fs.get("/penalty", (_request, reply) => {
    return reply.redirect("/penalty/");
  });
}
