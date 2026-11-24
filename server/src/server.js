
import app from './app.js';
import { env } from './config/env.js';

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

    server.close((error) => {
        if (error) {
            console.error('Error closing server:', error);
            process.exitCode = 1;
            return;
        }

        console.log('Server closed successfully.');
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
