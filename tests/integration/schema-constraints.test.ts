import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/backend/db/schema';
import { eq } from 'drizzle-orm';
import { getVerifiedTestDb } from './setup-test-db';

describe('RIMS Database Schema & Relational Integrity Tests', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    const verified = await getVerifiedTestDb();
    sql = verified.sql;
    db = verified.db;
  });

  afterAll(async () => {
    if (sql) {
      await sql.end({ timeout: 2 });
    }
  });

  it('enforces unique email constraint on users table', async () => {
    const testEmail = `test_unique_${Date.now()}@example.com`;

    // First insert succeeds
    await db.insert(schema.users).values({
      email: testEmail,
      passwordHash: 'argon2id_mock_hash_for_schema_testing',
      firstName: 'Alice',
      lastName: 'Smith',
      role: 'ADMIN',
    });

    // Duplicate insert must throw unique violation
    await expect(
      db.insert(schema.users).values({
        email: testEmail,
        passwordHash: 'another_hash',
        firstName: 'Duplicate',
        lastName: 'User',
        role: 'WAREHOUSE_STAFF',
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(schema.users).where(eq(schema.users.email, testEmail));
  });

  it('enforces unique SKU constraint and non-negative pricing on products table', async () => {
    // Setup test category
    const [cat] = await db
      .insert(schema.categories)
      .values({
        name: 'Hardware',
        code: `CAT_${Date.now()}`,
      })
      .returning();

    const uniqueSku = `SKU_${Date.now()}`;

    // Valid product insert
    const [prod] = await db
      .insert(schema.products)
      .values({
        sku: uniqueSku,
        name: 'Steel Bolt',
        categoryId: cat.id,
        costPrice: '12.5000',
        sellingPrice: '25.0000',
      })
      .returning();

    expect(prod.id).toBeDefined();

    // Duplicate SKU must fail
    await expect(
      db.insert(schema.products).values({
        sku: uniqueSku,
        name: 'Duplicate Bolt',
        categoryId: cat.id,
        costPrice: '10.0000',
        sellingPrice: '20.0000',
      })
    ).rejects.toThrow();

    // Negative cost price must fail check constraint
    await expect(
      db.insert(schema.products).values({
        sku: `SKU_NEG_${Date.now()}`,
        name: 'Invalid Bolt',
        categoryId: cat.id,
        costPrice: '-5.0000',
        sellingPrice: '10.0000',
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(schema.products).where(eq(schema.products.id, prod.id));
    await db.delete(schema.categories).where(eq(schema.categories.id, cat.id));
  });

  it('enforces unique warehouse code and single balance row per product/warehouse pair', async () => {
    const whCode = `WH_${Date.now()}`;
    const [wh] = await db
      .insert(schema.warehouses)
      .values({
        code: whCode,
        name: 'Central Warehouse',
      })
      .returning();

    const [cat] = await db
      .insert(schema.categories)
      .values({
        name: 'Electronics',
        code: `CAT_WH_${Date.now()}`,
      })
      .returning();

    const [prod] = await db
      .insert(schema.products)
      .values({
        sku: `SKU_WH_${Date.now()}`,
        name: 'Microcontroller',
        categoryId: cat.id,
      })
      .returning();

    // Initial balance insert
    const [balance] = await db
      .insert(schema.inventoryBalances)
      .values({
        warehouseId: wh.id,
        productId: prod.id,
        onHandQty: '100.00',
        reservedQty: '20.00',
        quarantinedQty: '10.00',
      })
      .returning();

    // Verify generated availableQty: 100 - 20 - 10 = 70.00
    expect(Number(balance.availableQty)).toBe(70.0);

    // Duplicate balance for same (warehouseId, productId) must fail unique constraint
    await expect(
      db.insert(schema.inventoryBalances).values({
        warehouseId: wh.id,
        productId: prod.id,
        onHandQty: '50.00',
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(schema.inventoryBalances).where(eq(schema.inventoryBalances.id, balance.id));
    await db.delete(schema.products).where(eq(schema.products.id, prod.id));
    await db.delete(schema.categories).where(eq(schema.categories.id, cat.id));
    await db.delete(schema.warehouses).where(eq(schema.warehouses.id, wh.id));
  });

  it('enforces non-negative check constraints on inventory balances and available stock', async () => {
    const [wh] = await db
      .insert(schema.warehouses)
      .values({
        code: `WH_CHK_${Date.now()}`,
        name: 'East Hub',
      })
      .returning();

    const [cat] = await db
      .insert(schema.categories)
      .values({
        name: 'Tools',
        code: `CAT_CHK_${Date.now()}`,
      })
      .returning();

    const [prod] = await db
      .insert(schema.products)
      .values({
        sku: `SKU_CHK_${Date.now()}`,
        name: 'Wrench',
        categoryId: cat.id,
      })
      .returning();

    // Negative on_hand_qty must fail check constraint
    await expect(
      db.insert(schema.inventoryBalances).values({
        warehouseId: wh.id,
        productId: prod.id,
        onHandQty: '-10.00',
      })
    ).rejects.toThrow();

    // Reservation exceeding on_hand must fail availableQty >= 0 check constraint
    await expect(
      db.insert(schema.inventoryBalances).values({
        warehouseId: wh.id,
        productId: prod.id,
        onHandQty: '10.00',
        reservedQty: '15.00', // Available = 10 - 15 = -5 (violates inv_bal_available_chk)
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(schema.products).where(eq(schema.products.id, prod.id));
    await db.delete(schema.categories).where(eq(schema.categories.id, cat.id));
    await db.delete(schema.warehouses).where(eq(schema.warehouses.id, wh.id));
  });

  it('enforces distinct source and destination warehouse on stock transfers', async () => {
    const [wh] = await db
      .insert(schema.warehouses)
      .values({
        code: `WH_TR_${Date.now()}`,
        name: 'Transfer Hub',
      })
      .returning();

    // Same source and destination warehouse must fail check constraint
    await expect(
      db.insert(schema.stockTransfers).values({
        transferNumber: `TR_${Date.now()}`,
        sourceWarehouseId: wh.id,
        destinationWarehouseId: wh.id, // Same warehouse!
      })
    ).rejects.toThrow();

    await db.delete(schema.warehouses).where(eq(schema.warehouses.id, wh.id));
  });
});
