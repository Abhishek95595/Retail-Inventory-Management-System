/**
 * Centralized, fail-closed database target validation policy for seed scripts.
 *
 * Requirements:
 * 1. DATABASE_URL must be explicitly provided and nonempty.
 * 2. URL must be a valid, parsable URL.
 * 3. In production (NODE_ENV=production), seeding is blocked unless ALLOW_PROD_SEED=true is set.
 * 4. The target host must be localhost / 127.0.0.1 / 0.0.0.0 unless explicitly allowed via ALLOW_REMOTE_SEED=true.
 * 5. The target database name must be in the approved list ['rims_dev', 'rims_demo', 'rims_staging', 'rims_test']
 *    unless ALLOW_ANY_DB_NAME=true is set.
 * 6. Even with ALLOW_PROD_SEED=true, host and database name validations remain active and enforced.
 * 7. Never print connection credentials, passwords, or the raw URL in error messages.
 */

export const ALLOWED_SEED_DATABASE_NAMES = [
  'rims_dev',
  'rims_demo',
  'rims_staging',
  'rims_test',
] as const;

export interface ValidateSeedTargetOptions {
  scriptName: string;
}

export function validateSeedDatabaseTarget(
  databaseUrl: string | undefined | null,
  options: ValidateSeedTargetOptions = { scriptName: 'seed' }
): { parsed: URL; dbName: string; host: string } {
  const { scriptName } = options;

  if (!databaseUrl || databaseUrl.trim() === '') {
    throw new Error(
      `⛔ FATAL: DATABASE_URL must be explicitly supplied and non-empty to run ${scriptName}. Refusing to connect with implicit or default fallback.`
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(`⛔ FATAL: DATABASE_URL is not a valid URL format for ${scriptName}.`);
  }

  const dbName = parsed.pathname.replace(/^\//, '');
  if (!dbName || dbName.trim() === '') {
    throw new Error(
      `⛔ FATAL: DATABASE_URL does not specify a target database name for ${scriptName}.`
    );
  }

  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
    throw new Error(
      `⛔ FATAL: ${scriptName} cannot be executed in production environment without explicit ALLOW_PROD_SEED=true.`
    );
  }

  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '0.0.0.0';

  if (!isLocalhost && !process.env.ALLOW_REMOTE_SEED) {
    throw new Error(
      `⛔ FATAL: Refusing to seed non-localhost database host "${parsed.hostname}" without explicit ALLOW_REMOTE_SEED=true.`
    );
  }

  const isAllowedName = (ALLOWED_SEED_DATABASE_NAMES as readonly string[]).includes(dbName);
  if (!isAllowedName && !process.env.ALLOW_ANY_DB_NAME) {
    throw new Error(
      `⛔ FATAL: Target database "${dbName}" is not in the allowed seed list [${ALLOWED_SEED_DATABASE_NAMES.join(
        ', '
      )}]. Explicit ALLOW_ANY_DB_NAME=true required to override.`
    );
  }

  return { parsed, dbName, host: parsed.hostname };
}
