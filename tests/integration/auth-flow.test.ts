import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/backend/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password';
import { authOptions } from '@/lib/auth';
import { getVerifiedTestDb } from './setup-test-db';

describe('RIMS Authentication & Credentials Flow Integration Tests', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  const activeEmail = `active_user_${Date.now()}@rims.local`;
  const inactiveEmail = `inactive_user_${Date.now()}@rims.local`;
  const testPassword = 'ValidPassword123!';

  beforeAll(async () => {
    const verified = await getVerifiedTestDb();
    sql = verified.sql;
    db = verified.db;

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

  describe('Mid-Session Deactivation & Role Change Verification', () => {
    it('verifyUserSession reflects real-time DB state and rejects deactivated account during existing session', async () => {
      const { verifyUserSession } = await import('@/backend/server/auth');

      // Fetch user from DB
      const [dbUser] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, activeEmail))
        .limit(1);

      expect(dbUser).toBeDefined();

      const existingJwtUser = {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        role: 'INVENTORY_MANAGER' as const,
        isActive: true,
      };

      // 1. Verify active session succeeds
      const authUser1 = await verifyUserSession(existingJwtUser);
      expect(authUser1.id).toBe(dbUser.id);
      expect(authUser1.role).toBe('INVENTORY_MANAGER');
      expect(authUser1.isActive).toBe(true);

      // 2. Change role in database (e.g. demote to WAREHOUSE_STAFF)
      await db
        .update(schema.users)
        .set({ role: 'WAREHOUSE_STAFF', updatedAt: new Date() })
        .where(eq(schema.users.id, dbUser.id));

      // verifyUserSession must return the updated live role, not the stale JWT role
      const authUser2 = await verifyUserSession(existingJwtUser);
      expect(authUser2.role).toBe('WAREHOUSE_STAFF');

      // 3. Deactivate user in database mid-session
      await db
        .update(schema.users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.users.id, dbUser.id));

      // verifyUserSession must now throw ACCOUNT_DEACTIVATED immediately
      await expect(verifyUserSession(existingJwtUser)).rejects.toThrow('ACCOUNT_DEACTIVATED');

      // Restore user to active and original role for cleanup
      await db
        .update(schema.users)
        .set({ isActive: true, role: 'INVENTORY_MANAGER', updatedAt: new Date() })
        .where(eq(schema.users.id, dbUser.id));
    });
  });
});
