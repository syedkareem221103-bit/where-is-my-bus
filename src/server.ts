import { createServer } from 'http';
import app from './app';
import env from './config/env';
import prisma from './config/database';
import logger from './utils/logger';
import SocketServer from './realtime/socket.server';
import { eventBus } from './utils/event-bus';
import { FleetAggregator } from './modules/fleet/fleet.aggregator';

const server = createServer(app);

// Initialize real-time Socket Server
const socketServer = SocketServer.getInstance();
socketServer.init(server);

// Initialize Fleet Aggregator for Admin Dashboards
FleetAggregator.getInstance();

async function bootstrap() {
  try {
    // 1. Verify Database Connection
    logger.info('Verifying database connectivity...');
    await prisma.$connect();
    logger.info('Database connection established successfully');

    // 2. Start HTTP & Socket Server listening
    server.listen(env.PORT, () => {
      logger.info(`🚀 Where Is My Bus SaaS engine running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error('Fatal initialization error during server bootstrap:', error);
    process.exit(1);
  }
}

// Implement Graceful Shutdown mechanisms
const handleShutdown = async (signal: string) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  // Fallback timeout to force exit if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10000).unref();

  try {
    // 1. Stop accepting new HTTP connections
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        logger.info('HTTP server closed.');
        resolve();
      });
    });

    // 2. Disconnect WebSockets safely
    await new Promise<void>((resolve, reject) => {
      socketServer.close((err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 3. Clear EventBus listeners to prevent memory leaks in background processing
    eventBus.removeAllListeners();
    FleetAggregator.getInstance().shutdown();
    logger.info('EventBus listeners and aggregators cleared.');

    // 4. Disconnect Prisma Client
    await prisma.$disconnect();
    logger.info('Database connection closed.');

    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  // Optional: exit immediately or restart process in production orchestrators (PM2, Kubernetes)
});

bootstrap();
