import { FastifyInstance } from "fastify";
import { loginSchema, loginResponseSchema } from "../../schemas/login.schema";

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/login",
    {
      schema: {
        body: loginSchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    async (request, reply) => {},
  );
}
