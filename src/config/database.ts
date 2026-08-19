import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import env from './env';

// Inject configurable connection limit to the connection URL
const dbUrl = new URL(env.DATABASE_URL);
dbUrl.searchParams.set('connection_limit', env.DB_CONNECTION_LIMIT.toString());

// Implement global Prisma singleton for Jest / Next.js to prevent connection exhaustion
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient<any> };

// Use a Proxy for lazy initialization. This prevents app.ts from eagerly spawning
// a Rust engine during test teardown unless a database query is actually executed.
export const prisma = new Proxy({} as PrismaClient<any>, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl.toString(),
          },
        },
        log: [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'info' },
          { emit: 'event', level: 'warn' },
        ],
      });
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = globalForPrisma.prisma;
    }
    const val = (globalForPrisma.prisma as any)[prop];
    return typeof val === 'function' ? val.bind(globalForPrisma.prisma) : val;
  }
});

// Configure query logs to redirect to our central winston logger
if (typeof prisma.$on === 'function') {
  prisma.$on('query', (e: any) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
    }
  });

  prisma.$on('info', (e: any) => {
    logger.info(e.message);
  });

  prisma.$on('warn', (e: any) => {
    logger.warn(e.message);
  });

  prisma.$on('error', (e: any) => {
    logger.error(`Prisma Client Error: ${e.message}`);
  });
}

export default prisma;
