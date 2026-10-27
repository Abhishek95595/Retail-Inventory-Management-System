import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from './schema';
import path from 'path';

export const TARGET_STAGING_DB_NAME = 'rims_staging';

export interface ValidateStagingMigrationOptions {
  databaseUrl?: string;
  allowStagingMigration?: string;
  skipConnectionCheck?: boolean;
}

export interface VerifiedStagingTarget {
  databaseName: string;
  host: string;
}

/**
 * Validates that the staging migration preflight environment satisfies all safety requirements:
 * 1. Explicit opt-in flag RIMS_ALLOW_STAGING_MIGRATION === 'true'.
 * 2. DATABASE_URL is non-empty and a valid URL.
 * 3. Parsed target database name equals exactly 'rims_staging'.
 * 4. Production, test, dev, and all other database names are strictly rejected.
 *
 * Does not expose credentials, passwords, or connection strings in error messages.
 */
export function validateStagingMigrationPreflight(
  options: ValidateStagingMigrationOptions = {}
): VerifiedStagingTarget {
  const allowStaging =
    options.allowStagingMigration !== undefined
      ? options.allowStagingMigration
      : process.env.RIMS_ALLOW_STAGING_MIGRATION;

  if (allowStaging !== 'true') {
    throw new Error(
      '⛔ FATAL: Staging migration requires explicit opt-in via RIMS_ALLOW_STAGING_MIGRATION=true.'
    );
  }

  const databaseUrl =
    options.databaseUrl !== undefined ? options.databaseUrl : process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error(
      '⛔ FATAL: DATABASE_URL is missing or empty. Staging migration requires an explicit DATABASE_URL pointing to "rims_staging".'
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('⛔ FATAL: DATABASE_URL is not a valid URL format.');
  }

  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName || dbName.trim() === '') {
    throw new Error('⛔ FATAL: DATABASE_URL does not specify a target database name.');
  }

  if (dbName !== TARGET_STAGING_DB_NAME) {
    throw new Error(
      `⛔ FATAL: Target database must be "${TARGET_STAGING_DB_NAME}". Attempted target: "${dbName}". Execution blocked.`
    );
  }

  return {
    databaseName: dbName,
    host: parsed.hostname,
  };
}

/**
 * Connects to PostgreSQL, checks `SELECT current_database()`, and verifies that the live connected
 * database strictly matches 'rims_staging'.
 */
export async function verifyConnectedStagingDatabase(
  sqlClient: postgres.Sql
): Promise<string> {
  const rows = await sqlClient<{ current_db: string }[]>`SELECT current_database() as current_db`;
  const actualDb = rows[0]?.current_db;

  if (actualDb !== TARGET_STAGING_DB_NAME) {
    throw new Error(
      `⛔ FATAL: Verified PostgreSQL connected database is "${actualDb}", which does NOT match required "${TARGET_STAGING_DB_NAME}". Execution aborted.`
    );
  }

  return actualDb;
}

export interface StagingMigrationDependencies {
  clientFactory?: (url: string) => postgres.Sql;
  migrator?: (db: unknown, config: { migrationsFolder: string }) => Promise<void>;
}

/**
 * Runs Drizzle migrations against the validated staging database.
 * Executes in a fail-closed sequence and guarantees client cleanup in a finally block.
 */
export async function runStagingMigration(
  customDatabaseUrl?: string,
  deps: StagingMigrationDependencies = {}
): Promise<{ success: boolean; database: string }> {
  const databaseUrl = customDatabaseUrl || process.env.DATABASE_URL;

  // 1. Validate environment & URL parameters
  validateStagingMigrationPreflight({ databaseUrl });

  // 2. Open transient client for verification & migration
  const clientFactory = deps.clientFactory || ((url: string) => postgres(url, { max: 1 }));
  const sql = clientFactory(databaseUrl!);

  try {
    // 3. Verify actual live connected database identity
    const verifiedDbName = await verifyConnectedStagingDatabase(sql);

    // 4. Initialize Drizzle instance and run migrations
    const db = drizzle(sql, { schema });
    const migrationsFolder = path.resolve(
      process.cwd(),
      'src/backend/db/migrations'
    );

    console.log(`🚀 Executing verified migrations on database "${verifiedDbName}"...`);
    const runMigration = deps.migrator || migrate;
    await runMigration(db, { migrationsFolder });
    console.log(`✅ Staging migrations successfully applied to "${verifiedDbName}".`);

    return { success: true, database: verifiedDbName };
  } finally {
    await sql.end({ timeout: 2 });
  }
}

// Allow CLI execution if called directly
if (process.argv[1] && process.argv[1].endsWith('run-staging-migration.ts')) {
  runStagingMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
