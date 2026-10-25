import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { hashPassword } from '../lib/password';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres_dev_password@localhost:5432/rims_dev';

async function seedAdmin() {
  console.log('🌱 Starting safe development administrator seed...');

  const sql = postgres(connectionString, { max: 1 });

  const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@rims.local';
  const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'AdminPassword123!';

  try {
    // Check if admin already exists
    const existing =
      await sql`SELECT id, email, role FROM users WHERE email = ${adminEmail.toLowerCase()};`;

    if (existing.length > 0) {
      console.log(`ℹ️ Admin user already exists: ${existing[0].email} (Role: ${existing[0].role})`);
      await sql.end();
      process.exit(0);
    }

    // Generate secure Argon2id hash
    console.log('🔒 Generating Argon2id password hash...');
    const passwordHash = await hashPassword(adminPassword);

    // Insert admin record
    const [inserted] = await sql`
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        role,
        is_active
      ) VALUES (
        ${adminEmail.toLowerCase()},
        ${passwordHash},
        'System',
        'Administrator',
        'ADMIN',
        true
      )
      RETURNING id, email, role, is_active;
    `;

    console.log('✅ Development administrator successfully seeded:');
    console.log(`   ID       : ${inserted.id}`);
    console.log(`   Email    : ${inserted.email}`);
    console.log(`   Role     : ${inserted.role}`);
    console.log(`   Active   : ${inserted.is_active}`);
    console.log('\nCredentials for local login:');
    console.log(`   Email    : ${adminEmail}`);
    console.log(`   Password : ${adminPassword}\n`);

    await sql.end();
    process.exit(0);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Failed to seed development administrator:', error.message);
    await sql.end({ timeout: 1 });
    process.exit(1);
  }
}

seedAdmin();
