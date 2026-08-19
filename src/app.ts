import express, { Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './utils/logger';
import { errorHandler } from './errors/error-handler';
import { initializeKeys } from './utils/crypto';
import rateLimiter from './middlewares/rate-limiter';
import prisma from './config/database';
import env from './config/env';
import client from 'prom-client';

// Enable default metrics (CPU, memory, event loop lag, etc.) except during tests to prevent open handle leaks
if (process.env.NODE_ENV !== 'test') {
  client.collectDefaultMetrics({ prefix: 'wimb_' });
}


// Import Modular Routers
import authRouter from './modules/auth/auth.routes';
import organizationRouter from './modules/organization/organization.routes';
import userRouter from './modules/user/user.routes';
import busRouter from './modules/bus/bus.routes';
import routeRouter from './modules/route/route.routes';
import driverRouter from './modules/driver/driver.routes';
import studentRouter from './modules/student/student.routes';
import scheduleRouter from './modules/schedule/schedule.routes';
import tripRouter from './modules/trip/trip.routes';
import attendanceRouter from './modules/attendance/attendance.routes';
import parentRouter from './modules/parent/parent.routes';
import analyticsRouter from './modules/analytics/analytics.routes';
import { reportRoutes } from './modules/report/report.routes';
import geofenceRouter from './modules/geofence/geofence.routes';
import alertRouter from './modules/alert/alert.routes';
import healthRouter from './modules/health/health.routes';
const app: Express = express();

// Initialize and validate cryptographic keys at startup
initializeKeys();

// Trust reverse proxies (e.g. AWS ALB, Nginx) for accurate rate limiting and IP logging
app.set('trust proxy', 1);

// 1. Basic Security & Setup Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// 2. Structured HTTP log forwarding to Winston
const httpLogStream = {
  write: (message: string) => logger.http(message.trim()),
};
// Skip logging for health endpoints to avoid log pollution
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms', {
  stream: httpLogStream,
  skip: (req) => req.url === '/health' || req.url === '/ready'
}));

// Performance: Compress HTTP responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    // Skip compression for health checks or small payloads (handled by default threshold)
    if (req.url === '/health' || req.url === '/ready') return false;
    return compression.filter(req, res);
  }
}));

// 3. Apply DDoS protection rate limits to API routes
app.use('/api/', rateLimiter);

// 4. API Health & Readiness Endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (ex) {
    res.status(500).end((ex as Error).message);
  }
});


app.get('/ready', async (_req, res, next) => {
  try {
    // Lightweight database connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Readiness check failed: ${(error as Error).message}`);
    res.status(503).json({
      status: 'unavailable',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// 5. Mount Modular Routing Tables (v1)
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/organizations', organizationRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/buses', busRouter);
app.use('/api/v1/routes', routeRouter);
app.use('/api/v1/drivers', driverRouter);
app.use('/api/v1/students', studentRouter);
app.use('/api/v1/schedules', scheduleRouter);
app.use('/api/v1/trips', tripRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1/parents', parentRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/geofences', geofenceRouter);
app.use('/api/v1/alerts', alertRouter);
app.use('/api/v1/system/health', healthRouter);
// 6. 404 Fallback Router Handler
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Requested REST endpoint not found' });
});

// 7. Mount Centralized Exception Interceptor
app.use(errorHandler);

import { HealthAlertService } from './modules/health/health.alert.service';
import { HealthScheduler } from './modules/health/health.scheduler.service';
import { HealthAggregationService } from './modules/health/health.aggregation.service';
import GeofenceService from './modules/geofence/geofence.service';
import AlertProcessingService from './modules/alert/alert.processing.service';
import AlertRetentionService from './modules/alert/alert.retention.service';
import { FleetAggregator } from './modules/fleet/fleet.aggregator';
import { queueProvider } from './modules/notification/notification.module';

export const teardownApp = async (options: { skipPrisma?: boolean } = {}) => {
  try {
    HealthAlertService.shutdown();
    HealthScheduler.shutdown();
    HealthAggregationService.shutdown();
    GeofenceService.shutdown();
    AlertProcessingService.shutdown();
    AlertRetentionService.shutdown();
    FleetAggregator.getInstance().shutdown();
    if (queueProvider && typeof queueProvider.shutdown === 'function') {
      await queueProvider.shutdown();
    }

    // Check the global singleton first so we don't accidentally trigger the Proxy get() trap in database.ts
    const globalForPrisma = globalThis as unknown as { prisma: any };
    const activePrisma = globalForPrisma.prisma;

    if (activePrisma && typeof activePrisma.$disconnect === 'function' && !options.skipPrisma) {
      await activePrisma.$disconnect();
    }
  } catch (err) {
    logger.error('Error during centralized app teardown', err);
  }
};

export default app;
