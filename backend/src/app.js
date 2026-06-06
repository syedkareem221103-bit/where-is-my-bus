const express = require('express');
const cors = require('cors');
const prisma = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const driverRoutes = require('./routes/driver.routes');
const parentRoutes = require('./routes/parent.routes');

const app = express();

// Centralized Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Dynamic CORS whitelist mapping production and development hosts
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5001',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) : [])
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Secure HTTP Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
  next();
});

// In-Memory IP Rate Limiter
const rateLimits = {};
const rateLimiter = (limit, windowMs) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    if (!rateLimits[ip]) {
      rateLimits[ip] = [];
    }
    rateLimits[ip] = rateLimits[ip].filter(timestamp => now - timestamp < windowMs);
    
    if (rateLimits[ip].length >= limit) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    
    rateLimits[ip].push(now);
    next();
  };
};

const authLimiter = rateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes
const emergencyLimiter = rateLimiter(20, 1 * 60 * 1000); // 20 requests per 1 minute

// Routes Mount with Rate Limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin/emergencies', emergencyLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api/driver/emergency', emergencyLimiter);
app.use('/api/driver/delay', emergencyLimiter);
app.use('/api/driver', driverRoutes);
app.use('/api/parent', parentRoutes);

// Database-aware Health Check endpoint
app.get('/health', async (req, res) => {
  try {
    // Ping database to verify connection health
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Health Check Failure:', error);
    res.status(500).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url} - ${err.stack || err.message || err}`);

  // Handle Prisma Database constraint errors (P2002 etc)
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      error: 'Database operation failed due to constraint violation.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // Handle express validator or request validation errors
  if (err.status && err.status === 400) {
    return res.status(400).json({ error: err.message });
  }

  // Fallback 500 error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;
