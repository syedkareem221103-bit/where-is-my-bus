import { createServer } from 'http';
import app from './app';
import env from './config/env';
import prisma from './config/database';
import logger from './utils/logger';
import SocketServer from './realtime/socket.server';
import { eventBus } from './utils/event-bus';
import { FleetAggregator } from './modules/fleet/fleet.aggregator';
import { reportScheduler } from './modules/report/report.scheduler';
import { HealthScheduler } from './modules/health/health.scheduler.service';
import { teardownApp } from './app';

const server = createServer(app);

// Initialize real-time Socket Server
const socketServer = SocketServer.getInstance();
socketServer.init(server);

// Initialize Fleet Aggregator for Admin Dashboards
FleetAggregator.getInstance();

// Initialize System Health Monitoring
HealthScheduler.initialize();

async function bootstrap() {
  try {
    // 1. Verify Database Connection
    logger.info('Verifying database connectivity...');
    await prisma.$connect();
    logger.info('Database connection established successfully');

    // Start Report Scheduler
    reportScheduler.start();

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
        resolve();
      });
    });

    // 2. Shut down all background resources (Redis, queues, aggregators)
    logger.info('Shutting down background services...');
    await teardownApp();

    // 3. Disconnect Socket Clients
    await new Promise<void>((resolve, reject) => {
      socketServer.close((err?: Error) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 3. Clear EventBus listeners to prevent memory leaks in background processing
    eventBus.removeAllListeners();
    reportScheduler.stop();
    logger.info('EventBus listeners and aggregators cleared.');

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
