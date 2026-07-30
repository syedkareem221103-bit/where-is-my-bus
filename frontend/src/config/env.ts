import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().url('VITE_API_URL must be a valid URL'),
  VITE_SOCKET_URL: z.string().url('VITE_SOCKET_URL must be a valid URL'),
  VITE_GOOGLE_MAPS_KEY: z.string().min(1, 'VITE_GOOGLE_MAPS_KEY is required'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables. Check console for details.');
}

export const env = parsed.data;
