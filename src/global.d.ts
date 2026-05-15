import 'fastify';

declare module 'fastify' {
    interface FastifyInstance {
        TypeProvider: import('@fastify/type-provider-typebox').TypeBoxTypeProvider
    }
}