const { PrismaClient } = require('@prisma/client');

// Load environment variables
require('dotenv').config();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// SQLite Concurrency optimization: Enable WAL mode and set busy_timeout only if using SQLite
const dbUrl = process.env.DATABASE_URL || '';
const isSqlite = !dbUrl || dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:');

if (isSqlite) {
  prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;')
    .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout=10000;'))
    .then(() => console.log('SQLite optimized with WAL mode and busy_timeout=10000ms'))
    .catch((err) => {
      console.warn('Database pragmas configuration result:', err.message || err);
    });
}

module.exports = prisma;
