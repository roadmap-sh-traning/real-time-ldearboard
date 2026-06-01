import { type FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/", async function (_request, _reply) {
    return { root: true };
  });

  fastify.get("/penalty", async (_request, reply) => {
    return reply.redirect("/penalty/");
  });
};

export default root
