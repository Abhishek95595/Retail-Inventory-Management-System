import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { envSchema, env } from '@/lib/env';

describe('RIMS Environment & Database Client Safety Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('fails closed when DATABASE_URL is missing', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.format().DATABASE_URL?._errors).toBeDefined();
    }
  });

  it('fails closed when DATABASE_URL is malformed', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.DATABASE_URL = 'not-a-valid-url';
    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
  });

  it('enforces NEXTAUTH_SECRET minimum 32 chars in production', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/rims_dev';
    process.env.NEXTAUTH_URL = 'https://rims.example.com';
    process.env.NEXTAUTH_SECRET = 'too-short-secret';

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.format().NEXTAUTH_SECRET?._errors).toBeDefined();
    }
  });

  it('enforces NEXTAUTH_URL in production', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/rims_dev';
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    delete process.env.NEXTAUTH_URL;

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.format().NEXTAUTH_URL?._errors).toBeDefined();
    }
  });

  it('succeeds in production when all required variables are valid', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/rims_dev';
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    process.env.NEXTAUTH_URL = 'https://rims.example.com';

    const result = envSchema.safeParse(process.env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe('postgresql://localhost:5432/rims_dev');
      expect(result.data.PORT).toBe(3000);
      expect(result.data.NODE_ENV).toBe('production');
    }
  });

  it('permits module import without throwing when DATABASE_URL is missing', async () => {
    // Importing db and env should not throw during module evaluation
    const { db, client } = await import('@/backend/db');
    const { env: importedEnv } = await import('@/lib/env');
    expect(db).toBeDefined();
    expect(client).toBeDefined();
    expect(importedEnv).toBeDefined();
  });

  it('validates env Proxy reflection traps (in, ownKeys, getOwnPropertyDescriptor)', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/rims_dev';

    expect('DATABASE_URL' in env).toBe(true);
    expect('NODE_ENV' in env).toBe(true);
    expect('NON_EXISTENT_KEY' in env).toBe(false);

    const keys = Object.keys(env);
    expect(keys).toContain('DATABASE_URL');
    expect(keys).toContain('NODE_ENV');
    expect(keys).toContain('PORT');

    const desc = Object.getOwnPropertyDescriptor(env, 'DATABASE_URL');
    expect(desc).toBeDefined();
    expect(desc?.value).toBe('postgresql://localhost:5432/rims_dev');
  });

  it('validates db Proxy method forwarding, query builders, and transaction handler without active socket connection', async () => {
    const { db } = await import('@/backend/db');

    // Reflection traps check
    expect('select' in db).toBe(true);
    expect('transaction' in db).toBe(true);
    expect('query' in db).toBe(true);
    expect(typeof db.select).toBe('function');
    expect(typeof db.transaction).toBe('function');

    // Query builder chaining check (select().from() shape)
    const selectBuilder = db.select();
    expect(selectBuilder).toBeDefined();
    expect(typeof selectBuilder.from).toBe('function');

    // Verify transaction forwards to internal implementation
    const txMock = vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({ mockedTx: true });
    });

    const realDb = db as unknown as { transaction: typeof txMock };
    const originalTransaction = realDb.transaction;
    realDb.transaction = txMock;

    try {
      const res = await db.transaction(async (tx) => {
        return { success: true, tx };
      });
      expect(txMock).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ success: true, tx: { mockedTx: true } });
    } finally {
      realDb.transaction = originalTransaction;
    }
  });

  it('validates client Proxy function application and tagged-template invocations', async () => {
    const { client } = await import('@/backend/db');

    expect(typeof client).toBe('function');
    expect('unsafe' in client).toBe(true);

    // Verify calling client directly triggers apply trap forwarding
    const originalRealClient = (globalThis as unknown as { conn?: unknown }).conn;
    const clientApplyMock = vi.fn().mockReturnValue('mockedQueryResult');

    (globalThis as unknown as { conn?: unknown }).conn = clientApplyMock;

    try {
      const result = (client as unknown as (...args: unknown[]) => unknown)('SELECT 1');
      expect(clientApplyMock).toHaveBeenCalledWith('SELECT 1');
      expect(result).toBe('mockedQueryResult');
    } finally {
      (globalThis as unknown as { conn?: unknown }).conn = originalRealClient;
    }
  });
});
