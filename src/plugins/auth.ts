import fp from "fastify-plugin";
import * as dotenv from "dotenv";
import path from "path";
import jwt from "@fastify/jwt";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "super-secret-key",
  });

  fastify.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});
