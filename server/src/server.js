import app from './app.js';
import { env, validateEnv } from './config/env.js';
import { prisma } from './config/prisma.js';

try {
    validateEnv();
} catch (error) {
    console.error('Environment validation failed:');
    console.error(error.message);
    process.exit(1);
}

// Start the HTTP server
const server = app.listen(env.port, () => {
    console.log('================================');
    console.log('SHAHEEN CENTER API');
    console.log('================================');
    console.log(`Environment: ${env.nodeEnv}`);
    console.log(`Port: ${env.port}`);
    console.log(`Health: http://localhost:${env.port}/api/health`);
    console.log('================================');
});

// Graceful shutdown
function shutdown(signal) {
    console.log(`\n${signal} received. Closing server...`);

    server.close(async (error) => {
        if (error) {
            console.error('Error closing server:', error);
            process.exitCode = 1;
            return;
        }

        await prisma.$disconnect();
        console.log('Server closed successfully.');
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
