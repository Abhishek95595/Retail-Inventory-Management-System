import { describe, it, expect, vi } from 'vitest';
import {
  validateStagingMigrationPreflight,
  verifyConnectedStagingDatabase,
  TARGET_STAGING_DB_NAME,
} from '@/backend/db/run-staging-migration';
import postgres from 'postgres';

describe('RIMS Staging Migration Safeguard Unit Tests', () => {
  const validStagingUrl = 'postgresql://testuser:testpass@localhost:5432/rims_staging';

  it('rejects execution when RIMS_ALLOW_STAGING_MIGRATION is missing or not true', () => {
    expect(() =>
      validateStagingMigrationPreflight({
        databaseUrl: validStagingUrl,
        allowStagingMigration: undefined,
      })
    ).toThrow(/explicit opt-in via RIMS_ALLOW_STAGING_MIGRATION=true/);

    expect(() =>
      validateStagingMigrationPreflight({
        databaseUrl: validStagingUrl,
        allowStagingMigration: 'false',
      })
    ).toThrow(/explicit opt-in via RIMS_ALLOW_STAGING_MIGRATION=true/);
  });

  it('rejects execution when DATABASE_URL is missing or empty', () => {
    expect(() =>
      validateStagingMigrationPreflight({
        databaseUrl: '',
        allowStagingMigration: 'true',
      })
    ).toThrow(/DATABASE_URL is missing or empty/);

    expect(() =>
      validateStagingMigrationPreflight({
        databaseUrl: '   ',
        allowStagingMigration: 'true',
      })
    ).toThrow(/DATABASE_URL is missing or empty/);
  });

  it('rejects execution when DATABASE_URL is malformed', () => {
    expect(() =>
      validateStagingMigrationPreflight({
        databaseUrl: 'not_a_valid_url',
        allowStagingMigration: 'true',
      })
    ).toThrow(/DATABASE_URL is not a valid URL format/);
  });

  it('rejects execution when DATABASE_URL points to non-staging databases', () => {
    const unapprovedTargets = [
      'postgresql://localhost:5432/rims_prod',
      'postgresql://localhost:5432/rims_production',
      'postgresql://localhost:5432/rims_dev',
      'postgresql://localhost:5432/rims_test',
      'postgresql://localhost:5432/postgres',
      'postgresql://localhost:5432/production_data',
    ];

    for (const targetUrl of unapprovedTargets) {
      expect(() =>
        validateStagingMigrationPreflight({
          databaseUrl: targetUrl,
          allowStagingMigration: 'true',
        })
      ).toThrow(/Target database must be "rims_staging"/);
    }
  });

  it('succeeds preflight validation when opt-in and target match rims_staging', () => {
    const result = validateStagingMigrationPreflight({
      databaseUrl: validStagingUrl,
      allowStagingMigration: 'true',
    });

    expect(result).toBeDefined();
    expect(result.databaseName).toBe(TARGET_STAGING_DB_NAME);
    expect(result.host).toBe('localhost');
  });

  it('rejects live database verification if SELECT current_database() does not return rims_staging', async () => {
    // Mock sql client returning a different database name
    const mockSql = vi.fn().mockResolvedValue([{ current_db: 'rims_production' }]) as unknown as postgres.Sql;

    await expect(verifyConnectedStagingDatabase(mockSql)).rejects.toThrow(
      /Verified PostgreSQL connected database is "rims_production", which does NOT match required "rims_staging"/
    );
  });

  it('accepts live database verification when SELECT current_database() returns rims_staging', async () => {
    const mockSql = vi.fn().mockResolvedValue([{ current_db: 'rims_staging' }]) as unknown as postgres.Sql;

    const verified = await verifyConnectedStagingDatabase(mockSql);
    expect(verified).toBe('rims_staging');
  });

  it('ensures runStagingMigration fails closed, never executes migrate(), and closes client when database mismatch occurs', async () => {
    const originalEnv = { ...process.env };
    process.env.RIMS_ALLOW_STAGING_MIGRATION = 'true';

    const mockEnd = vi.fn().mockResolvedValue(undefined);
    const mockSql = Object.assign(
      vi.fn().mockResolvedValue([{ current_db: 'rims_production' }]), // Mismatched DB returned
      {
        end: mockEnd,
      }
    ) as unknown as postgres.Sql;

    const mockClientFactory = vi.fn().mockReturnValue(mockSql);
    const mockMigrator = vi.fn().mockResolvedValue(undefined);

    try {
      const { runStagingMigration } = await import('@/backend/db/run-staging-migration');

      await expect(
        runStagingMigration(validStagingUrl, {
          clientFactory: mockClientFactory,
          migrator: mockMigrator,
        })
      ).rejects.toThrow(/Verified PostgreSQL connected database is "rims_production"/);

      // Verify that migrate() was NEVER invoked
      expect(mockMigrator).not.toHaveBeenCalled();

      // Verify client was ended in finally block
      expect(mockEnd).toHaveBeenCalled();
    } finally {
      process.env = originalEnv;
    }
  });
});
