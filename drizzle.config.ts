import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env.local first if present, otherwise fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.trim() === '') {
  throw new Error(
    '⛔ FATAL: DATABASE_URL is required for Drizzle migrations. Refusing to run with fallback.'
  );
}

// Require explicit rims_test target for test isolation
let targetDbName = '';
try {
  const parsed = new URL(databaseUrl);
  targetDbName = parsed.pathname.replace(/^\//, '');
} catch {
  throw new Error('⛔ FATAL: DATABASE_URL is not a valid URL.');
}

if (targetDbName !== 'rims_test') {
  throw new Error(
    `⛔ FATAL: Target database must be "rims_test". Attempted target: "${targetDbName}". Execution blocked.`
  );
}

export default defineConfig({
  schema: './src/backend/db/schema/**/*.ts',
  out: './src/backend/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
