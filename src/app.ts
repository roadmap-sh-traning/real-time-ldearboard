import { join } from "node:path";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import fastifyBcrypt from "fastify-bcrypt";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifyRoutes from "@fastify/routes";

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

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };
