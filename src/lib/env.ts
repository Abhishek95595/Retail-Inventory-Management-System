import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .string({
        required_error: 'DATABASE_URL is required to connect to the database',
      })
      .url(),
    PORT: z.coerce.number().default(3000),
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(16).optional(),
  })
  .refine(
    (data) => {
      // In production/staging, NEXTAUTH_SECRET is strictly required and must be at least 32 characters
      if (data.NODE_ENV === 'production') {
        return !!data.NEXTAUTH_SECRET && data.NEXTAUTH_SECRET.length >= 32;
      }
      return true;
    },
    {
      message:
        'NEXTAUTH_SECRET is required and must be at least 32 characters long in production environments (generate using: openssl rand -base64 32)',
      path: ['NEXTAUTH_SECRET'],
    }
  )
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return !!data.NEXTAUTH_URL;
      }
      return true;
    },
    {
      message: 'NEXTAUTH_URL is required in production environments',
      path: ['NEXTAUTH_URL'],
    }
  );

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

export function validateEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid or missing environment configuration:', result.error.format());
    throw new Error('Environment configuration validation failed');
  }
  cachedEnv = result.data;
  return cachedEnv;
}

export { envSchema };

export const env: Env = new Proxy({} as Env, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') {
      return undefined;
    }
    const validated = validateEnv();
    return validated[prop as keyof Env];
  },
  has(_target, prop: string | symbol) {
    if (typeof prop === 'symbol') {
      return false;
    }
    const validated = validateEnv();
    return prop in validated;
  },
  ownKeys(_target) {
    const validated = validateEnv();
    return Reflect.ownKeys(validated);
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    const validated = validateEnv();
    return Reflect.getOwnPropertyDescriptor(validated, prop);
  },
});
