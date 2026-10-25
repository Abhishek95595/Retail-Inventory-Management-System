import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  recordStockReceipt,
  recordStockIssue,
  recordStockAdjustment,
  getMovementHistory,
} from '@/server/movements';

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

describe('RIMS Stock Movement Ledger & Invariant Integration Tests', () => {
  let sql: postgres.Sql;
  let dbClient: ReturnType<typeof drizzle>;

  let testWarehouseId: string;
  let testInactiveWarehouseId: string;
  let testCategoryId: string;
  let testProductId: string;
  let testArchivedProductId: string;

  const createdMovementIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(connectionString, { max: 1 });
    dbClient = drizzle(sql, { schema });

    // 1. Create active warehouse
    const [wh] = await dbClient
      .insert(schema.warehouses)
      .values({
        code: `WH_MOV_${Date.now()}`,
        name: 'Movement Test Warehouse',
        isActive: true,
      })
      .returning();
    testWarehouseId = wh.id;

    // 2. Create inactive warehouse
    const [inWh] = await dbClient
      .insert(schema.warehouses)
      .values({
        code: `WH_INACT_${Date.now()}`,
        name: 'Inactive Facility',
        isActive: false,
      })
      .returning();
    testInactiveWarehouseId = inWh.id;

    // 3. Create category
    const [cat] = await dbClient
      .insert(schema.categories)
      .values({
        code: `CAT_MOV_${Date.now()}`,
        name: 'Movement Test Category',
      })
      .returning();
    testCategoryId = cat.id;

    // 4. Create active product
    const [prod] = await dbClient
      .insert(schema.products)
      .values({
        sku: `SKU_MOV_${Date.now()}`,
        name: 'Active Test Widget',
        categoryId: cat.id,
        isArchived: false,
      })
      .returning();
    testProductId = prod.id;

    // 5. Create archived product
    const [archProd] = await dbClient
      .insert(schema.products)
      .values({
        sku: `SKU_ARCH_${Date.now()}`,
        name: 'Archived Obsolete Widget',
        categoryId: cat.id,
        isArchived: true,
      })
      .returning();
    testArchivedProductId = archProd.id;
  });

  afterAll(async () => {
    // 1. Clean up movements
    for (const movId of createdMovementIds) {
      await dbClient
        .delete(schema.inventoryMovements)
        .where(eq(schema.inventoryMovements.id, movId));
    }

    // 2. Clean up inventory balances for test entities
    await dbClient
      .delete(schema.inventoryBalances)
      .where(eq(schema.inventoryBalances.warehouseId, testWarehouseId));
    await dbClient
      .delete(schema.inventoryBalances)
      .where(eq(schema.inventoryBalances.warehouseId, testInactiveWarehouseId));

    // 3. Clean up products
    await dbClient.delete(schema.products).where(eq(schema.products.id, testProductId));
    await dbClient.delete(schema.products).where(eq(schema.products.id, testArchivedProductId));

    // 4. Clean up category
    await dbClient.delete(schema.categories).where(eq(schema.categories.id, testCategoryId));

    // 5. Clean up warehouses
    await dbClient.delete(schema.warehouses).where(eq(schema.warehouses.id, testWarehouseId));
    await dbClient
      .delete(schema.warehouses)
      .where(eq(schema.warehouses.id, testInactiveWarehouseId));

    await sql.end();
  });

  it('records stock receipt, initializes balance row, and accurately increments on_hand_qty', async () => {
    const idempotencyKey = `KEY_REC_${Date.now()}`;

    const receipt = await recordStockReceipt({
      warehouseId: testWarehouseId,
      productId: testProductId,
      quantity: 100,
      reason: 'Inbound shipment from supplier',
      referenceType: 'MANUAL_RECEIPT',
      idempotencyKey,
    });
    createdMovementIds.push(receipt.id);

    expect(receipt.id).toBeDefined();
    expect(receipt.movementType).toBe('RECEIPT');
    expect(parseFloat(receipt.quantity)).toBe(100);
    expect(parseFloat(receipt.balanceBefore)).toBe(0);
    expect(parseFloat(receipt.balanceAfter)).toBe(100);

    // Verify balance row in database
    const [bal] = await dbClient
      .select()
      .from(schema.inventoryBalances)
      .where(eq(schema.inventoryBalances.warehouseId, testWarehouseId));
    expect(parseFloat(bal.onHandQty)).toBe(100);
    expect(parseFloat(bal.availableQty)).toBe(100); // Generated column formula

    // Duplicate submission using same idempotency key must not double-receive
    const dupReceipt = await recordStockReceipt({
      warehouseId: testWarehouseId,
      productId: testProductId,
      quantity: 100,
      reason: 'Retry inbound shipment',
      referenceType: 'MANUAL_RECEIPT',
      idempotencyKey,
    });
    expect(dupReceipt.id).toBe(receipt.id);

    // Verify on-hand has not changed
    const [balAfter] = await dbClient
      .select()
      .from(schema.inventoryBalances)
      .where(eq(schema.inventoryBalances.warehouseId, testWarehouseId));
    expect(parseFloat(balAfter.onHandQty)).toBe(100);
  });

  it('rejects stock receipts for deactivated warehouses and archived products', async () => {
    // 1. Inactive warehouse
    await expect(
      recordStockReceipt({
        warehouseId: testInactiveWarehouseId,
        productId: testProductId,
        quantity: 50,
        reason: 'Should be rejected',
      })
    ).rejects.toThrow(/is deactivated/);

    // 2. Archived product
    await expect(
      recordStockReceipt({
        warehouseId: testWarehouseId,
        productId: testArchivedProductId,
        quantity: 50,
        reason: 'Should be rejected',
      })
    ).rejects.toThrow(/is archived/);
  });

  it('records stock issue and rejects attempts to issue more than available stock', async () => {
    // Current stock is 100 from previous test
    const issue = await recordStockIssue({
      warehouseId: testWarehouseId,
      productId: testProductId,
      quantity: 30,
      reason: 'Internal departmental consumption',
      referenceType: 'INTERNAL_CONSUMPTION',
    });
    createdMovementIds.push(issue.id);

    expect(issue.movementType).toBe('DISPATCH');
    expect(parseFloat(issue.quantity)).toBe(30);
    expect(parseFloat(issue.balanceBefore)).toBe(100);
    expect(parseFloat(issue.balanceAfter)).toBe(70);

    // Attempt to issue 80 units when only 70 are available must fail
    await expect(
      recordStockIssue({
        warehouseId: testWarehouseId,
        productId: testProductId,
        quantity: 80,
        reason: 'Over-issue attempt',
      })
    ).rejects.toThrow(/Insufficient available stock/);
  });

  it('records stock adjustments with mandatory reasons and enforces non-negative invariants', async () => {
    // Upward adjustment (+)
    const adjIn = await recordStockAdjustment({
      warehouseId: testWarehouseId,
      productId: testProductId,
      direction: 'IN',
      quantity: 15,
      reason: 'Cycle count found extra units in bin 4B',
      referenceType: 'CYCLE_COUNT',
    });
    createdMovementIds.push(adjIn.id);

    expect(adjIn.movementType).toBe('ADJUSTMENT_IN');
    expect(parseFloat(adjIn.balanceBefore)).toBe(70);
    expect(parseFloat(adjIn.balanceAfter)).toBe(85);

    // Downward adjustment (−)
    const adjOut = await recordStockAdjustment({
      warehouseId: testWarehouseId,
      productId: testProductId,
      direction: 'OUT',
      quantity: 10,
      reason: 'Damaged packaging written off',
      referenceType: 'CYCLE_COUNT',
    });
    createdMovementIds.push(adjOut.id);

    expect(adjOut.movementType).toBe('ADJUSTMENT_OUT');
    expect(parseFloat(adjOut.balanceBefore)).toBe(85);
    expect(parseFloat(adjOut.balanceAfter)).toBe(75);

    // Excessive downward adjustment must fail
    await expect(
      recordStockAdjustment({
        warehouseId: testWarehouseId,
        productId: testProductId,
        direction: 'OUT',
        quantity: 100,
        reason: 'Excessive downward count',
      })
    ).rejects.toThrow(/Cannot adjust stock downward/);
  });

  it('prevents overselling during concurrent stock issues via row-level locking', async () => {
    // Current on_hand is 75 units. Attempting two concurrent issues of 50 units each (total 100)
    // Exactly one must succeed and one must be rejected with insufficient stock error.
    const p1 = recordStockIssue({
      warehouseId: testWarehouseId,
      productId: testProductId,
      quantity: 50,
      reason: 'Concurrent request 1',
    });

    const p2 = recordStockIssue({
      warehouseId: testWarehouseId,
      productId: testProductId,
      quantity: 50,
      reason: 'Concurrent request 2',
    });

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    if (fulfilled[0].status === 'fulfilled') {
      createdMovementIds.push(fulfilled[0].value.id);
    }

    // Final balance must be 75 - 50 = 25
    const [finalBal] = await dbClient
      .select()
      .from(schema.inventoryBalances)
      .where(eq(schema.inventoryBalances.warehouseId, testWarehouseId));

    expect(parseFloat(finalBal.onHandQty)).toBe(25);
    expect(parseFloat(finalBal.availableQty)).toBe(25);
  });

  it('queries movement ledger history with filters and verify audit log entries', async () => {
    const history = await getMovementHistory({
      warehouseId: testWarehouseId,
      productId: testProductId,
      limit: 10,
    });

    expect(history.total).toBeGreaterThanOrEqual(4);
    expect(history.items.length).toBeGreaterThanOrEqual(4);

    // Verify audit logs were written transactionally for each movement
    const auditEntries = await dbClient
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.entityType, 'MOVEMENT'));

    expect(auditEntries.length).toBeGreaterThanOrEqual(4);
  });
});
