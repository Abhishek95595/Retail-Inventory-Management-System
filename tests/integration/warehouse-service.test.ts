import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  createWarehouse,
  updateWarehouse,
  toggleWarehouseStatus,
  deleteWarehouse,
  getWarehouseById,
} from '@/server/warehouses';
import {
  getInventoryBalances,
  getProductInventoryBalances,
  ensureZeroBalanceRecord,
} from '@/server/inventory';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://abhishekverma:@localhost:5432/rims_dev';

// Mock server auth using the seeded administrator account
vi.mock('@/server/auth', () => ({
  requirePermission: vi.fn().mockResolvedValue({
    id: '7b7d58da-d45a-411d-bd0e-c42f65521482',
    email: 'admin@rims.local',
    name: 'System Administrator',
    role: 'ADMIN',
    isActive: true,
  }),
  requireAuth: vi.fn().mockResolvedValue({
    id: '7b7d58da-d45a-411d-bd0e-c42f65521482',
    email: 'admin@rims.local',
    name: 'System Administrator',
    role: 'ADMIN',
    isActive: true,
  }),
}));

describe('RIMS Warehouse Management & Inventory Balances Integration Tests', () => {
  let sql: postgres.Sql;
  let dbClient: ReturnType<typeof drizzle>;

  const createdWarehouseIds: string[] = [];
  const createdCategoryIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdBalanceIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(connectionString, { max: 1 });
    dbClient = drizzle(sql, { schema });
  });

  afterAll(async () => {
    // 1. Clean up inventory balances
    for (const bId of createdBalanceIds) {
      await dbClient.delete(schema.inventoryBalances).where(eq(schema.inventoryBalances.id, bId));
    }

    // 2. Clean up products
    for (const pId of createdProductIds) {
      await dbClient.delete(schema.products).where(eq(schema.products.id, pId));
    }

    // 3. Clean up categories
    for (const cId of createdCategoryIds) {
      await dbClient.delete(schema.categories).where(eq(schema.categories.id, cId));
    }

    // 4. Clean up warehouses
    for (const wId of createdWarehouseIds) {
      await dbClient.delete(schema.warehouses).where(eq(schema.warehouses.id, wId));
    }

    await sql.end();
  });

  it('creates, reads, updates, and activates/deactivates a warehouse', async () => {
    const code = `WH_TEST_${Date.now()}`;
    const wh = await createWarehouse({
      code,
      name: 'North Central Depot',
      address: '456 Freight Way, Dock 2',
      contactPhone: '+1-555-0199',
      isActive: true,
    });
    createdWarehouseIds.push(wh.id);

    expect(wh.id).toBeDefined();
    expect(wh.code).toBe(code);
    expect(wh.isActive).toBe(true);

    // Read by ID
    const fetched = await getWarehouseById(wh.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('North Central Depot');

    // Update details
    const updated = await updateWarehouse({
      id: wh.id,
      name: 'North Central Regional Distribution Center',
    });
    expect(updated.name).toBe('North Central Regional Distribution Center');

    // Toggle status (deactivate)
    const deactivated = await toggleWarehouseStatus(wh.id, false);
    expect(deactivated.isActive).toBe(false);

    // Reactivate
    const reactivated = await toggleWarehouseStatus(wh.id, true);
    expect(reactivated.isActive).toBe(true);

    // Verify audit log entries were recorded
    const logs = await dbClient
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.entityId, wh.id));
    expect(logs.length).toBeGreaterThanOrEqual(3); // CREATE, UPDATE, DEACTIVATE/ACTIVATE
  });

  it('rejects duplicate warehouse facility codes', async () => {
    const duplicateCode = `DUP_WH_${Date.now()}`;
    const wh1 = await createWarehouse({
      code: duplicateCode,
      name: 'Facility Alpha',
      isActive: true,
    });
    createdWarehouseIds.push(wh1.id);

    await expect(
      createWarehouse({
        code: duplicateCode,
        name: 'Facility Beta',
        isActive: true,
      })
    ).rejects.toThrow('A warehouse with this code already exists.');
  });

  it('creates zero-quantity balance row strictly adhering to unique (warehouse, product) and generated available_qty', async () => {
    // 1. Create a warehouse
    const wh = await createWarehouse({
      code: `BAL_WH_${Date.now()}`,
      name: 'Balance Facility',
      isActive: true,
    });
    createdWarehouseIds.push(wh.id);

    // 2. Create category & product
    const [cat] = await dbClient
      .insert(schema.categories)
      .values({
        code: `CAT_BAL_${Date.now()}`,
        name: 'Balance Category',
      })
      .returning();
    createdCategoryIds.push(cat.id);

    const [prod] = await dbClient
      .insert(schema.products)
      .values({
        sku: `SKU_BAL_${Date.now()}`,
        name: 'Stocked Inventory Product',
        categoryId: cat.id,
        costPrice: '10.0000',
        sellingPrice: '20.0000',
      })
      .returning();
    createdProductIds.push(prod.id);

    // 3. Ensure zero-quantity balance row
    const balance = await ensureZeroBalanceRecord(wh.id, prod.id);
    createdBalanceIds.push(balance.id);

    expect(balance.id).toBeDefined();

    // 4. Directly query database row to verify generated available_qty
    const [dbBal] = await dbClient
      .select()
      .from(schema.inventoryBalances)
      .where(eq(schema.inventoryBalances.id, balance.id));

    expect(parseFloat(dbBal.onHandQty)).toBe(0);
    expect(parseFloat(dbBal.reservedQty)).toBe(0);
    expect(parseFloat(dbBal.quarantinedQty)).toBe(0);
    // Persisted generated column strictly equals onHand - reserved - quarantined
    expect(parseFloat(dbBal.availableQty)).toBe(0);

    // 5. Duplicate balance creation must be idempotent and return existing row
    const duplicateAttempt = await ensureZeroBalanceRecord(wh.id, prod.id);
    expect(duplicateAttempt.id).toBe(balance.id);
  });

  it('prevents hard deletion of a warehouse when inventory balances exist', async () => {
    const wh = await createWarehouse({
      code: `PROT_WH_${Date.now()}`,
      name: 'Protected Storage Warehouse',
      isActive: true,
    });
    createdWarehouseIds.push(wh.id);

    // Link a product balance
    const [cat] = await dbClient
      .insert(schema.categories)
      .values({
        code: `CAT_PROT_${Date.now()}`,
        name: 'Protection Category',
      })
      .returning();
    createdCategoryIds.push(cat.id);

    const [prod] = await dbClient
      .insert(schema.products)
      .values({
        sku: `SKU_PROT_${Date.now()}`,
        name: 'Protection Product',
        categoryId: cat.id,
      })
      .returning();
    createdProductIds.push(prod.id);

    const bal = await ensureZeroBalanceRecord(wh.id, prod.id);
    createdBalanceIds.push(bal.id);

    // Deletion must be rejected with informative error message
    await expect(deleteWarehouse(wh.id)).rejects.toThrow(
      /Cannot delete warehouse: existing inventory balances are linked/
    );
  });

  it('supports inventory balance search, filtering, and per-product balance querying', async () => {
    const listResult = await getInventoryBalances({
      limit: 10,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });

    expect(listResult).toHaveProperty('items');
    expect(listResult).toHaveProperty('total');
    expect(listResult).toHaveProperty('page');
    expect(Array.isArray(listResult.items)).toBe(true);

    if (createdProductIds.length > 0) {
      const perProductBalances = await getProductInventoryBalances(createdProductIds[0]);
      expect(Array.isArray(perProductBalances)).toBe(true);
      expect(perProductBalances.length).toBeGreaterThanOrEqual(1);
    }
  });
});
