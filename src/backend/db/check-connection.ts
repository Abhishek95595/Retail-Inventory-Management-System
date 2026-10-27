import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/rims_dev';

async function checkDatabase() {
  console.log('🔍 Testing database connectivity via Drizzle driver...');

  // Mask password for safe console logging
  try {
    const parsed = new URL(connectionString);
    parsed.password = '****';
    console.log(`Connecting to: ${parsed.toString()}`);
  } catch {
    console.log('Connecting to provided DATABASE_URL');
  }

  const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });

  try {
    const result =
      await sql`SELECT 1 as connected, current_database() as database, version() as version;`;
    console.log('✅ Database connection test succeeded!');
    console.log(`   Database Name : ${result[0].database}`);
    console.log(`   Postgres Info : ${result[0].version.split('\n')[0]}`);
    await sql.end();
    process.exit(0);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Database connection test failed:', error.message);
    await sql.end({ timeout: 1 });
    process.exit(1);
  }
}

checkDatabase();
