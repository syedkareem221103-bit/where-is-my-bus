import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL'),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  ALLOW_DEV_EPHEMERAL_KEYS: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  ETA_DEFAULT_SPEED_KMH: z.coerce.number().default(20),
  DB_CONNECTION_LIMIT: z.coerce.number().default(10),
  CORS_ORIGIN: z.string().default('*'),
  SOCKET_CORS_ORIGIN: z.string().default('*'),
  SOCKET_PING_INTERVAL: z.coerce.number().default(25000),
  SOCKET_PING_TIMEOUT: z.coerce.number().default(20000),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.JWT_PRIVATE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_PRIVATE_KEY'],
        message: 'JWT_PRIVATE_KEY is required in production environment',
      });
    }
    if (!data.JWT_PUBLIC_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_PUBLIC_KEY'],
        message: 'JWT_PUBLIC_KEY is required in production environment',
      });
    }
  } else {
    if (!data.JWT_PRIVATE_KEY && !data.ALLOW_DEV_EPHEMERAL_KEYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ALLOW_DEV_EPHEMERAL_KEYS'],
        message: 'Must provide JWT_PRIVATE_KEY or set ALLOW_DEV_EPHEMERAL_KEYS=true in development/test',
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables Configuration:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
export default env;
