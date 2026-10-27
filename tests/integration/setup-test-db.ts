import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '@/backend/db/schema';

/**
 * Validates that integration tests run ONLY against an explicitly configured,
 * isolated, and dedicated test database (must be named exactly 'rims_test').
 *
 * Requirements:
 * 1. RIMS_ALLOW_INTEGRATION_TESTS=true must be set in process.env.
 * 2. DATABASE_URL must be explicitly provided in process.env.
 * 3. Parsed database name from DATABASE_URL must equal 'rims_test'.
 * 4. Actual connected PostgreSQL database identity (`SELECT current_database()`)
 *    must be queried and confirmed to be 'rims_test'.
 *
 * Throws immediately if any check fails, preventing any mutation to non-test databases.
 */
export async function getVerifiedTestDb(): Promise<{
  sql: postgres.Sql;
  db: ReturnType<typeof drizzle<typeof schema>>;
}> {
  if (process.env.RIMS_ALLOW_INTEGRATION_TESTS !== 'true') {
    throw new Error(
      '⛔ FATAL: Integration tests require explicit opt-in via RIMS_ALLOW_INTEGRATION_TESTS=true.'
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error(
      '⛔ FATAL: DATABASE_URL is missing or empty. Integration tests require an explicit DATABASE_URL pointing to "rims_test".'
    );
  }

  let parsedDbName: string;
  try {
    const parsed = new URL(databaseUrl);
    parsedDbName = parsed.pathname.replace(/^\//, '');
  } catch {
    throw new Error('⛔ FATAL: DATABASE_URL is not a valid URL.');
  }

  if (parsedDbName !== 'rims_test') {
    throw new Error(
      `⛔ FATAL: Integration tests must target database "rims_test". Current URL targets "${parsedDbName}".`
    );
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const rows = await sql<{ current_db: string }[]>`SELECT current_database() as current_db`;
    const actualDb = rows[0]?.current_db;

    if (actualDb !== 'rims_test') {
      await sql.end({ timeout: 2 });
      throw new Error(
        `⛔ FATAL: Verified PostgreSQL connected database is "${actualDb}", which does NOT match "rims_test". Execution aborted.`
      );
    }
  } catch (err: any) {
    await sql.end({ timeout: 2 }).catch(() => {});
    throw new Error(
      `⛔ FATAL: Database identity verification check failed: ${err?.message || String(err)}`
    );
  }

  const db = drizzle(sql, { schema });
  return { sql, db };
}

export const TEST_ADMIN_USER_ID = '7b7d58da-d45a-411d-bd0e-c42f65521482';
export const TEST_ADMIN_EMAIL = 'admin@rims.local';

/**
 * Ensures that the deterministic test administrator fixture exists in rims_test.users.
 * Uses ON CONFLICT (id) DO NOTHING so it can be called safely and idempotently.
 * Returns true if the user was inserted by this call, false if already present.
 */
export async function ensureTestAdminUser(db: ReturnType<typeof drizzle<typeof schema>>): Promise<boolean> {
  const [existing] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      isActive: schema.users.isActive,
    })
    .from(schema.users)
    .where(eq(schema.users.id, TEST_ADMIN_USER_ID));

  if (existing) {
    if (existing.email !== TEST_ADMIN_EMAIL || existing.role !== 'ADMIN') {
      throw new Error(
        `⛔ FATAL: Existing user fixture with ID "${TEST_ADMIN_USER_ID}" does not match required test identity. ` +
        `Expected email "${TEST_ADMIN_EMAIL}" and role "ADMIN", but found email "${existing.email}" and role "${existing.role}". ` +
        `Execution stopped to prevent silent test identity contamination.`
      );
    }
    return false;
  }

  const inserted = await db
    .insert(schema.users)
    .values({
      id: TEST_ADMIN_USER_ID,
      email: TEST_ADMIN_EMAIL,
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhashfortestfixtureonly',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });

  if (inserted.length === 0) {
    // A concurrent test suite inserted the row simultaneously. Verify the created row matches.
    const [concurrent] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      })
      .from(schema.users)
      .where(eq(schema.users.id, TEST_ADMIN_USER_ID));

    if (!concurrent || concurrent.email !== TEST_ADMIN_EMAIL || concurrent.role !== 'ADMIN') {
      throw new Error(
        `⛔ FATAL: Concurrent insert conflict resolved with invalid user fixture state for "${TEST_ADMIN_USER_ID}".`
      );
    }
    return false;
  }

  return true;
}

/**
 * Deletes the test administrator fixture only if it was created by the current test suite,
 * after all child records have been cleaned up.
 */
export async function cleanupTestAdminUser(
  db: ReturnType<typeof drizzle<typeof schema>>,
  wasCreatedBySuite: boolean
): Promise<void> {
  if (!wasCreatedBySuite) {
    return;
  }

  try {
    await db.delete(schema.users).where(eq(schema.users.id, TEST_ADMIN_USER_ID));
  } catch {
    // If other concurrent test suites still hold references, ignore cleanup error
  }
}
