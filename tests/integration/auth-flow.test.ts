import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';
import { authOptions } from '@/lib/auth';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://abhishekverma:@localhost:5432/rims_dev';

describe('RIMS Authentication & Credentials Flow Integration Tests', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle>;

  const activeEmail = `active_user_${Date.now()}@rims.local`;
  const inactiveEmail = `inactive_user_${Date.now()}@rims.local`;
  const testPassword = 'ValidPassword123!';

  beforeAll(async () => {
    sql = postgres(connectionString, { max: 1 });
    db = drizzle(sql, { schema });

    const passwordHash = await hashPassword(testPassword);

    // Seed active test user
    await db.insert(schema.users).values({
      email: activeEmail,
      passwordHash,
      firstName: 'Active',
      lastName: 'Tester',
      role: 'INVENTORY_MANAGER',
      isActive: true,
    });

    // Seed inactive test user
    await db.insert(schema.users).values({
      email: inactiveEmail,
      passwordHash,
      firstName: 'Deactivated',
      lastName: 'Tester',
      role: 'WAREHOUSE_STAFF',
      isActive: false, // Inactive account
    });
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, activeEmail));
    await db.delete(schema.users).where(eq(schema.users.email, inactiveEmail));
    await sql.end();
  });

  const credentialsProvider = authOptions.providers.find((p) => p.id === 'credentials') as any;
  const authorizeFn = credentialsProvider.options?.authorize || credentialsProvider.authorize;

  it('successfully authorizes an active user with valid credentials', async () => {
    const user = await authorizeFn({
      email: activeEmail,
      password: testPassword,
    });

    expect(user).toBeDefined();
    expect(user.email).toBe(activeEmail);
    expect(user.role).toBe('INVENTORY_MANAGER');
    expect(user.isActive).toBe(true);
    // Crucial security check: passwordHash must NOT be returned in user session object
    expect(user.passwordHash).toBeUndefined();
  });

  it('rejects authorization for an active user with incorrect password', async () => {
    const user = await authorizeFn({
      email: activeEmail,
      password: 'IncorrectPassword999',
    });

    expect(user).toBeNull();
  });

  it('rejects authorization for a deactivated account even with correct password', async () => {
    const user = await authorizeFn({
      email: inactiveEmail,
      password: testPassword,
    });

    expect(user).toBeNull();
  });

  it('rejects authorization for non-existent email with generic rejection', async () => {
    const user = await authorizeFn({
      email: 'non_existent_random_email@example.com',
      password: 'AnyPassword123!',
    });

    expect(user).toBeNull();
  });
});
