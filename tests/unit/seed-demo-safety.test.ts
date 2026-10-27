import { describe, expect, it } from 'vitest';
import { validateSeedDatabaseTarget, ALLOWED_SEED_DATABASE_NAMES } from '@/backend/db/seed-target-validator';

describe('Seed Target Validation & Fail-Closed Safety Unit Tests', () => {
  it('fails closed when DATABASE_URL is missing, undefined, or empty', () => {
    expect(() => validateSeedDatabaseTarget(undefined, { scriptName: 'seed-admin' })).toThrow(
      /DATABASE_URL must be explicitly supplied and non-empty/
    );
    expect(() => validateSeedDatabaseTarget('', { scriptName: 'seed-demo' })).toThrow(
      /DATABASE_URL must be explicitly supplied and non-empty/
    );
    expect(() => validateSeedDatabaseTarget('   ', { scriptName: 'seed-admin' })).toThrow(
      /DATABASE_URL must be explicitly supplied and non-empty/
    );
  });

  it('fails closed when DATABASE_URL is malformed or missing database name', () => {
    expect(() => validateSeedDatabaseTarget('not-a-valid-url')).toThrow(
      /DATABASE_URL is not a valid URL format/
    );
    expect(() => validateSeedDatabaseTarget('postgresql://localhost:5432/')).toThrow(
      /DATABASE_URL does not specify a target database name/
    );
  });

  it('validates database target guard rejecting production target without ALLOW_PROD_SEED', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_PROD_SEED;

    try {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.ALLOW_PROD_SEED;

      expect(() =>
        validateSeedDatabaseTarget('postgresql://localhost:5432/rims_dev', { scriptName: 'seed-admin' })
      ).toThrow(/cannot be executed in production environment without explicit ALLOW_PROD_SEED=true/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalAllow) process.env.ALLOW_PROD_SEED = originalAllow;
    }
  });

  it('rejects remote database hosts without explicit ALLOW_REMOTE_SEED even with ALLOW_PROD_SEED', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllowProd = process.env.ALLOW_PROD_SEED;
    const originalAllowRemote = process.env.ALLOW_REMOTE_SEED;

    try {
      (process.env as any).NODE_ENV = 'production';
      process.env.ALLOW_PROD_SEED = 'true';
      delete process.env.ALLOW_REMOTE_SEED;

      // Even with ALLOW_PROD_SEED=true, remote host must be rejected
      expect(() =>
        validateSeedDatabaseTarget('postgresql://postgres:pw@aws-rds-prod.com:5432/rims_dev')
      ).toThrow(/Refusing to seed non-localhost database host "aws-rds-prod.com"/);

      // With ALLOW_REMOTE_SEED=true, remote host is permitted
      process.env.ALLOW_REMOTE_SEED = 'true';
      expect(() =>
        validateSeedDatabaseTarget('postgresql://postgres:pw@aws-rds-prod.com:5432/rims_dev')
      ).not.toThrow();
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalAllowProd) process.env.ALLOW_PROD_SEED = originalAllowProd;
      else delete process.env.ALLOW_PROD_SEED;
      if (originalAllowRemote) process.env.ALLOW_REMOTE_SEED = originalAllowRemote;
      else delete process.env.ALLOW_REMOTE_SEED;
    }
  });

  it('rejects non-development database names without ALLOW_ANY_DB_NAME even with ALLOW_PROD_SEED', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllowProd = process.env.ALLOW_PROD_SEED;
    const originalAllowAny = process.env.ALLOW_ANY_DB_NAME;

    try {
      (process.env as any).NODE_ENV = 'production';
      process.env.ALLOW_PROD_SEED = 'true';
      delete process.env.ALLOW_ANY_DB_NAME;

      // Even with ALLOW_PROD_SEED=true, unapproved DB name is rejected
      expect(() =>
        validateSeedDatabaseTarget('postgresql://localhost:5432/rims_production')
      ).toThrow(/Target database "rims_production" is not in the allowed seed list/);

      // With ALLOW_ANY_DB_NAME=true, override is permitted
      process.env.ALLOW_ANY_DB_NAME = 'true';
      expect(() =>
        validateSeedDatabaseTarget('postgresql://localhost:5432/rims_production')
      ).not.toThrow();
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalAllowProd) process.env.ALLOW_PROD_SEED = originalAllowProd;
      else delete process.env.ALLOW_PROD_SEED;
      if (originalAllowAny) process.env.ALLOW_ANY_DB_NAME = originalAllowAny;
      else delete process.env.ALLOW_ANY_DB_NAME;
    }
  });

  it('accepts approved database names on localhost without errors', () => {
    for (const dbName of ALLOWED_SEED_DATABASE_NAMES) {
      expect(() =>
        validateSeedDatabaseTarget(`postgresql://postgres:pw@localhost:5432/${dbName}`)
      ).not.toThrow();
      expect(() =>
        validateSeedDatabaseTarget(`postgresql://postgres:pw@127.0.0.1:5432/${dbName}`)
      ).not.toThrow();
      expect(() =>
        validateSeedDatabaseTarget(`postgresql://postgres:pw@0.0.0.0:5432/${dbName}`)
      ).not.toThrow();
    }
  });
});
