import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const server = app.listen(env.port, () => {
    console.log(`[Shaheen API] Running on http://localhost:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
    console.log(`[Shaheen API] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
