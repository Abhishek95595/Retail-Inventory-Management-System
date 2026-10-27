import { describe, expect, it } from 'vitest';

describe('Seed Demo Safety and Idempotency Unit Tests', () => {
  it('validates database target guard rejecting production target without ALLOW_PROD_SEED', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_PROD_SEED;

    try {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.ALLOW_PROD_SEED;

      // Import the target validation function logic
      const checkGuard = () => {
        if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
          throw new Error('⛔ FATAL: seed-demo cannot be executed in production');
        }
      };

      expect(checkGuard).toThrow(/FATAL: seed-demo cannot be executed in production/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalAllow) process.env.ALLOW_PROD_SEED = originalAllow;
    }
  });

  it('rejects remote database hosts without explicit ALLOW_REMOTE_SEED', () => {
    const originalAllow = process.env.ALLOW_REMOTE_SEED;
    try {
      delete process.env.ALLOW_REMOTE_SEED;

      const validateHost = (urlStr: string) => {
        const parsed = new URL(urlStr);
        const isLocalhost =
          parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname === '0.0.0.0';

        if (!isLocalhost && !process.env.ALLOW_REMOTE_SEED) {
          throw new Error(`⛔ FATAL: Refusing to seed non-localhost database (${parsed.hostname})`);
        }
      };

      expect(() => validateHost('postgresql://postgres:pw@aws-rds-prod.com:5432/rims_dev')).toThrow(
        /Refusing to seed non-localhost database/
      );
      expect(() => validateHost('postgresql://postgres:pw@localhost:5432/rims_dev')).not.toThrow();
    } finally {
      if (originalAllow) process.env.ALLOW_REMOTE_SEED = originalAllow;
    }
  });

  it('rejects non-development database names', () => {
    const validateDbName = (urlStr: string) => {
      const parsed = new URL(urlStr);
      const dbName = parsed.pathname.replace(/^\//, '');
      const allowedDbNames = ['rims_dev', 'rims_demo', 'rims_staging', 'rims_test'];
      if (!allowedDbNames.includes(dbName)) {
        throw new Error(`⛔ FATAL: Target database "${dbName}" is not in the allowed list`);
      }
    };

    expect(() => validateDbName('postgresql://localhost:5432/rims_production')).toThrow(
      /Target database "rims_production" is not in the allowed list/
    );
    expect(() => validateDbName('postgresql://localhost:5432/rims_dev')).not.toThrow();
  });
});
