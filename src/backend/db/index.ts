import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/lib/env';

// Server-only runtime check to prevent accidental client-side database imports
if (typeof window !== 'undefined') {
  throw new Error('Database connection cannot be imported or executed in client components.');
}

// Global caching for development hot-reloading
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function getClient(): postgres.Sql {
  if (!globalForDb.conn) {
    globalForDb.conn = postgres(env.DATABASE_URL, {
      max: env.NODE_ENV === 'production' ? 20 : 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return globalForDb.conn;
}

function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!globalForDb.db) {
    globalForDb.db = drizzle(getClient(), { schema });
  }
  return globalForDb.db;
}

export const client: postgres.Sql = new Proxy((() => {}) as unknown as postgres.Sql, {
  get(_target, prop: string | symbol) {
    const realClient = getClient();
    const val = (realClient as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === 'function' ? val.bind(realClient) : val;
  },
  set(_target, prop: string | symbol, value: unknown) {
    const realClient = getClient();
    (realClient as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
  has(_target, prop: string | symbol) {
    const realClient = getClient();
    return prop in realClient;
  },
  ownKeys(_target) {
    const realClient = getClient();
    return Reflect.ownKeys(realClient);
  },
  getOwnPropertyDescriptor(_target, prop: string | symbol) {
    const realClient = getClient();
    return Reflect.getOwnPropertyDescriptor(realClient, prop);
  },
  apply(_target, thisArg, argArray) {
    const realClient = getClient();
    return Reflect.apply(realClient as unknown as (...args: unknown[]) => unknown, thisArg, argArray);
  },
});


export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_target, prop: string | symbol) {
      const realDb = getDb();
      const val = (realDb as unknown as Record<string | symbol, unknown>)[prop];
      return typeof val === 'function' ? val.bind(realDb) : val;
    },
    set(_target, prop: string | symbol, value: unknown) {
      const realDb = getDb();
      (realDb as unknown as Record<string | symbol, unknown>)[prop] = value;
      return true;
    },
    has(_target, prop: string | symbol) {
      const realDb = getDb();
      return prop in realDb;
    },
    ownKeys(_target) {
      const realDb = getDb();
      return Reflect.ownKeys(realDb);
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      const realDb = getDb();
      return Reflect.getOwnPropertyDescriptor(realDb, prop);
    },
  }
);
