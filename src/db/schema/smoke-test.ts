import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Minimal Phase 1 smoke-test schema table.
 *
 * PURPOSE:
 * Strictly used to verify that Drizzle ORM schema discovery, type generation,
 * and database connectivity work end-to-end without inventing or committing
 * the unapproved full domain schema (Users, Products, Warehouses, Orders, etc.)
 * which belongs to subsequent development phases.
 */
export const smokeTestRecords = pgTable('phase1_smoke_test_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  testKey: text('test_key').notNull(),
  status: text('status').notNull().default('OK'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
