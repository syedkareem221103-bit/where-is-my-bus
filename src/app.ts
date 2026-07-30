import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from './utils/logger';
import { errorHandler } from './errors/error-handler';
import { initializeKeys } from './utils/crypto';
import rateLimiter from './middlewares/rate-limiter';
import prisma from './config/database';

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
const app: Express = express();

// Initialize and validate cryptographic keys at startup
initializeKeys();

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
app.use(cors({ origin: '*' })); // Custom restrict for production in real deployments
app.use(express.json());

// 2. Structured HTTP log forwarding to Winston
const httpLogStream = {
  write: (message: string) => logger.http(message.trim()),
};
app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms', { stream: httpLogStream }));

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
// 6. 404 Fallback Router Handler
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Requested REST endpoint not found' });
});

// 7. Mount Centralized Exception Interceptor
app.use(errorHandler);

export default app;
