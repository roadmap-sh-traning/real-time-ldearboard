import { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import underPressure from "@fastify/under-pressure";
import { sql } from "drizzle-orm";

const healthCheckPlugin: FastifyPluginAsync = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(underPressure, {
      exposeStatusRoute: true,
      healthCheckInterval: 5000,
      healthCheck: async (instance: FastifyInstance): Promise<boolean> => {
        if (!instance.db) {
          throw new Error("Database client not initialized");
        }

        instance.log.info("Health check triggered: Ping sent to database.");

        try {
          await instance.db.execute(sql`SELECT 1`);
          return true;
        } catch (error) {
          instance.log.error(error, "Database health check failed");
          return false;
        }
      },
    });
  },
);

export default healthCheckPlugin;
