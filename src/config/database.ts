import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import env from './env';

// Inject configurable connection limit to the connection URL
const dbUrl = new URL(env.DATABASE_URL);
dbUrl.searchParams.set('connection_limit', env.DB_CONNECTION_LIMIT.toString());

// Instantiates a globally shared Prisma client with logging enabled for developer mode
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl.toString(),
    },
  },
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

// Configure query logs to redirect to our central winston logger
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
  }
});

prisma.$on('info', (e) => {
  logger.info(e.message);
});

prisma.$on('warn', (e) => {
  logger.warn(e.message);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma Client Error: ${e.message}`);
});

export default prisma;
