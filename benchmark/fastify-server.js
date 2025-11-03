// fastify-server.js
const path = require('path');
const fastify = require('fastify')({
    logger: false
});

// --- Benchmark Route ---
fastify.get('/', async (request, reply) => {
    reply.header('Content-Type', 'application/json');
    return '{"message":"pong"}';
});

// --- Start Server ---
const PORT = process.env.PORT || 7861;

const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Fastify benchmark server listening on port ${PORT}...`);
    } catch (err) {
        (fastify.log || console).error(err);
        process.exit(1);
    }
};

start();
console.log('FASTIFY_READY');
