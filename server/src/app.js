import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Security & request parsing
app.use(helmet());
app.use(
    cors({
        origin: env.clientUrl,
        credentials: true,
    }),
);
// Request logging
if (env.nodeEnv !== 'test') {
    app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Request parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Shaheen Center API is running',
        data: {
            service: 'shaheen-center-api',
            timestampUtc: new Date().toISOString(),
        },
    });
});

// Versioned / Modular API routes
app.use('/api', apiRoutes);

// 404 & Global error handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
