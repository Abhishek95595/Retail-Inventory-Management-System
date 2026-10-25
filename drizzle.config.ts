import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env.local first if present, otherwise fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

export default defineConfig({
  schema: './src/db/schema/**/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres_dev_password@localhost:5432/rims_dev',
  },
  verbose: true,
  strict: true,
});
