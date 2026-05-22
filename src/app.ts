import { join } from "node:path";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import fastifyBcrypt from "fastify-bcrypt";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifyRoutes from "@fastify/routes";
import fastifyRedis from "@fastify/redis";

export interface AppOptions
  extends FastifyServerOptions, Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

const app: FastifyPluginAsync<AppOptions> = async (
  rawFastify,
  opts,
): Promise<void> => {
  const fastify = rawFastify.withTypeProvider<TypeBoxTypeProvider>();

  // Place here your custom code!
  //
  fastify.register(fastifyBcrypt, {
    saltWorkFactor: 12,
  });

  await fastify.register(fastifyRoutes);

  fastify.addHook("onReady", async () => {
    console.log("All Registered Routes:", fastify.routes);
  });

  await fastify.register(fastifyRedis, {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  });

  // Do not touch the following lines

  // Plugins must finish before routes (routes depend on websocket, jwt, gameEvents).
  await fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  await fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };
