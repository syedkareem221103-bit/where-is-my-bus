const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

// Load environment variables
require('dotenv').config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing in production!');
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-where-is-my-bus-key-2026';

// Middleware to authenticate JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user to ensure they still exist and check their role
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        institutionId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Access denied: User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware for Role-Based Access Control
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied: Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  JWT_SECRET,
};
