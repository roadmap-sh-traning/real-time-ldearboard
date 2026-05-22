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
      const query = request.query as { token?: string };
      const header = request.headers.authorization;
      const token =
        query.token ??
        (header?.startsWith("Bearer ") ? header.slice(7) : undefined);

      if (token) {
        request.user = fastify.jwt.verify(token);
      } else {
        await request.jwtVerify();
      }
    } catch (err) {
      reply.send(err);
    }
  });
});
