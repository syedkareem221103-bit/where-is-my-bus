import { createServer } from 'http';
import app from './app';
import env from './config/env';
import prisma from './config/database';
import logger from './utils/logger';
import LiveTrackingGateway from './services/live-tracking.gateway';

const server = createServer(app);

// Initialize real-time Socket Gateway
const socketGateway = LiveTrackingGateway.getInstance();
socketGateway.init(server);

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

  // Close Server Port listener
  server.close(() => {
    logger.info('HTTP server closed.');
  });

  try {
    // Disconnect Prisma Client
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during database disconnection:', error);
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
