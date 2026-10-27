import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/backend/db/schema';
import {
  warehouses,
  categories,
  products,
  inventoryBalances,
  inventoryMovements,
  stockTransfers,
  stockTransferItems,
} from '@/backend/db/schema';
import {
  createTransfer,
  updateDraftTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  getTransferById,
} from '@/backend/server/transfers';
import { eq, and, inArray } from 'drizzle-orm';
import { getVerifiedTestDb, ensureTestAdminUser, cleanupTestAdminUser } from './setup-test-db';

// Mock server auth using the administrator account for integration tests
vi.mock('@/backend/server/auth', () => ({
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

describe('RIMS Inter-Warehouse Stock Transfer Integration Tests', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  let sourceWarehouseId: string;
  let destWarehouseId: string;
  let inactiveWarehouseId: string;
  let categoryId: string;
  let productAId: string;
  let productBId: string;
  let archivedProductId: string;
  let createdAdminUser = false;

  const createdTransferIds: string[] = [];

  beforeAll(async () => {
    const verified = await getVerifiedTestDb();
    sql = verified.sql;
    db = verified.db;
    createdAdminUser = await ensureTestAdminUser(db);

    // 1. Create warehouses
    const ts = Date.now();
    const [wh1] = await db
      .insert(warehouses)
      .values({
        code: `WH-SRC-${ts}`,
        name: `Source Warehouse ${ts}`,
        isActive: true,
      })
      .returning();
    sourceWarehouseId = wh1.id;

    const [wh2] = await db
      .insert(warehouses)
      .values({
        code: `WH-DST-${ts}`,
        name: `Destination Warehouse ${ts}`,
        isActive: true,
      })
      .returning();
    destWarehouseId = wh2.id;

    const [whInactive] = await db
      .insert(warehouses)
      .values({
        code: `WH-INA-${ts}`,
        name: `Inactive Warehouse ${ts}`,
        isActive: false,
      })
      .returning();
    inactiveWarehouseId = whInactive.id;

    // 3. Create category and products
    const [cat] = await db
      .insert(categories)
      .values({
        code: `CAT-TRF-${ts}`,
        name: `Transfer Category ${ts}`,
      })
      .returning();
    categoryId = cat.id;

    const [pA] = await db
      .insert(products)
      .values({
        sku: `SKU-TRF-A-${ts}`,
        name: `Transfer Product A ${ts}`,
        categoryId,
        uom: 'EACH',
        isArchived: false,
      })
      .returning();
    productAId = pA.id;

    const [pB] = await db
      .insert(products)
      .values({
        sku: `SKU-TRF-B-${ts}`,
        name: `Transfer Product B ${ts}`,
        categoryId,
        uom: 'EACH',
        isArchived: false,
      })
      .returning();
    productBId = pB.id;

    const [pArch] = await db
      .insert(products)
      .values({
        sku: `SKU-TRF-ARCH-${ts}`,
        name: `Archived Product ${ts}`,
        categoryId,
        uom: 'EACH',
        isArchived: true,
      })
      .returning();
    archivedProductId = pArch.id;

    // 4. Seed initial inventory balances at source warehouse
    // Product A: 100 on hand
    await db.insert(inventoryBalances).values({
      warehouseId: sourceWarehouseId,
      productId: productAId,
      onHandQty: '100.00',
      reservedQty: '10.00',
      quarantinedQty: '5.00',
    });

    // Product B: 50 on hand
    await db.insert(inventoryBalances).values({
      warehouseId: sourceWarehouseId,
      productId: productBId,
      onHandQty: '50.00',
      reservedQty: '0.00',
      quarantinedQty: '0.00',
    });
  });

  afterAll(async () => {
    // Clean up created records
    try {
      if (createdTransferIds.length > 0) {
        await db
          .delete(stockTransferItems)
          .where(inArray(stockTransferItems.stockTransferId, createdTransferIds));
        await db
          .delete(stockTransfers)
          .where(inArray(stockTransfers.id, createdTransferIds));
      }
      if (sourceWarehouseId) {
        await db
          .delete(inventoryMovements)
          .where(eq(inventoryMovements.warehouseId, sourceWarehouseId));
        await db
          .delete(inventoryBalances)
          .where(eq(inventoryBalances.warehouseId, sourceWarehouseId));
      }
      if (destWarehouseId) {
        await db
          .delete(inventoryMovements)
          .where(eq(inventoryMovements.warehouseId, destWarehouseId));
        await db.delete(inventoryBalances).where(eq(inventoryBalances.warehouseId, destWarehouseId));
      }
      if (categoryId) {
        await db.delete(products).where(eq(products.categoryId, categoryId));
        await db.delete(categories).where(eq(categories.id, categoryId));
      }
      if (sourceWarehouseId) {
        await db.delete(warehouses).where(eq(warehouses.id, sourceWarehouseId));
      }
      if (destWarehouseId) {
        await db.delete(warehouses).where(eq(warehouses.id, destWarehouseId));
      }
      if (inactiveWarehouseId) {
        await db.delete(warehouses).where(eq(warehouses.id, inactiveWarehouseId));
      }
      await cleanupTestAdminUser(db, createdAdminUser);
      if (sql) {
        await sql.end({ timeout: 2 });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('creates draft transfer with validation of warehouses, items, and duplicate prevention', async () => {
    // Reject same source and destination warehouse
    await expect(
      createTransfer({
        sourceWarehouseId,
        destinationWarehouseId: sourceWarehouseId,
        items: [{ productId: productAId, quantity: 5 }],
      })
    ).rejects.toThrow(/Source and destination warehouses must be different/i);

    // Reject inactive destination warehouse
    await expect(
      createTransfer({
        sourceWarehouseId,
        destinationWarehouseId: inactiveWarehouseId,
        items: [{ productId: productAId, quantity: 5 }],
      })
    ).rejects.toThrow(/inactive/i);

    // Reject archived product
    await expect(
      createTransfer({
        sourceWarehouseId,
        destinationWarehouseId: destWarehouseId,
        items: [{ productId: archivedProductId, quantity: 5 }],
      })
    ).rejects.toThrow(/archived/i);

    // Successfully create valid draft transfer
    const transfer = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      notes: 'Initial test transfer batch',
      items: [
        { productId: productAId, quantity: 20 },
        { productId: productBId, quantity: 15 },
      ],
    });
    createdTransferIds.push(transfer.id);

    expect(transfer).toBeDefined();
    expect(transfer.transferNumber).toMatch(/^TRF-\d{8}-\d{4}$/);
    expect(transfer.status).toBe('DRAFT');

    const detail = await getTransferById(transfer.id);
    expect(detail).toBeDefined();
    expect(detail?.itemCount).toBe(2);
    expect(detail?.totalQuantity).toBe('35.00');
    expect(detail?.items.length).toBe(2);
  });

  it('allows editing draft transfers and rejects editing after non-draft transitions', async () => {
    const draft = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      notes: 'Pre-edit notes',
      items: [{ productId: productAId, quantity: 10 }],
    });
    createdTransferIds.push(draft.id);

    // Update draft destination and notes
    const updated = await updateDraftTransfer(draft.id, {
      notes: 'Updated logistics notes',
      items: [{ productId: productAId, quantity: 12 }],
    });

    expect(updated.status).toBe('DRAFT');

    const refetched = await getTransferById(draft.id);
    expect(refetched?.notes).toBe('Updated logistics notes');
    expect(refetched?.totalQuantity).toBe('12.00');
  });

  it('cancels draft transfer without moving inventory and rejects cancelling dispatched transfer', async () => {
    const draft = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      items: [{ productId: productAId, quantity: 5 }],
    });
    createdTransferIds.push(draft.id);

    const cancelled = await cancelTransfer(draft.id, { reason: 'Cancelled by customer' });
    expect(cancelled.status).toBe('CANCELLED');

    // Reject dispatching a cancelled transfer
    await expect(dispatchTransfer(draft.id)).rejects.toThrow(/Invalid status transition/i);
  });

  it('dispatches transfer atomically: decrements source on_hand, validates availability, appends TRANSFER_OUT ledger', async () => {
    // Product A at source: on_hand=100, reserved=10, quarantined=5 -> available = 85
    const transfer = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      items: [
        { productId: productAId, quantity: 25 }, // valid: 25 <= 85
        { productId: productBId, quantity: 10 }, // valid: 10 <= 50
      ],
    });
    createdTransferIds.push(transfer.id);

    const dispatchResult = await dispatchTransfer(transfer.id);
    expect(dispatchResult.status).toBe('DISPATCHED');
    expect(dispatchResult.dispatchedAt).toBeDefined();

    // Verify source inventory balances after dispatch
    const [sourceBalA] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, sourceWarehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    // 100 - 25 = 75 on hand; available = 75 - 10 - 5 = 60
    expect(Number(sourceBalA.onHandQty)).toBe(75);
    expect(Number(sourceBalA.availableQty)).toBe(60);

    const [sourceBalB] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, sourceWarehouseId),
          eq(inventoryBalances.productId, productBId)
        )
      );
    // 50 - 10 = 40 on hand; available = 40
    expect(Number(sourceBalB.onHandQty)).toBe(40);
    expect(Number(sourceBalB.availableQty)).toBe(40);

    // Verify TRANSFER_OUT ledger movements
    const movements = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceId, transfer.transferNumber),
          eq(inventoryMovements.movementType, 'TRANSFER_OUT')
        )
      );
    expect(movements.length).toBe(2);
    expect(movements.every((m) => m.referenceType === 'TRANSFER')).toBe(true);

    // Reject double dispatch
    await expect(dispatchTransfer(transfer.id)).rejects.toThrow(/already been dispatched/i);

    // Reject direct cancellation of dispatched transfer
    await expect(cancelTransfer(transfer.id)).rejects.toThrow(
      /Cannot cancel transfer in 'DISPATCHED' status/i
    );
  });

  it('prevents overselling during transfer dispatch when requested quantity exceeds available stock', async () => {
    // Current Product A at source: available = 60. Request 70 units -> must fail
    const excessiveTransfer = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      items: [{ productId: productAId, quantity: 70 }],
    });
    createdTransferIds.push(excessiveTransfer.id);

    await expect(dispatchTransfer(excessiveTransfer.id)).rejects.toThrow(
      /Insufficient available stock/i
    );

    // Verify balance unchanged and transfer remains in DRAFT status
    const [sourceBalA] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, sourceWarehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(sourceBalA.onHandQty)).toBe(75);

    const checkTransfer = await getTransferById(excessiveTransfer.id);
    expect(checkTransfer?.status).toBe('DRAFT');
  });

  it('receives transfer idempotently: increments destination on_hand, initializes balance row, appends TRANSFER_IN ledger', async () => {
    // Create and dispatch a 20-unit transfer of Product B
    const transfer = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      items: [{ productId: productBId, quantity: 20 }],
    });
    createdTransferIds.push(transfer.id);

    await dispatchTransfer(transfer.id);

    // Verify destination warehouse has no balance row for Product B prior to receipt
    const preBal = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, destWarehouseId),
          eq(inventoryBalances.productId, productBId)
        )
      );
    expect(preBal.length).toBe(0);

    // Receive transfer at destination
    const receiveResult = await receiveTransfer(transfer.id);
    expect(receiveResult.status).toBe('RECEIVED');
    expect(receiveResult.receivedAt).toBeDefined();

    // Verify destination balance was safely initialized and incremented
    const [destBal] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, destWarehouseId),
          eq(inventoryBalances.productId, productBId)
        )
      );
    expect(destBal).toBeDefined();
    expect(Number(destBal.onHandQty)).toBe(20);
    expect(Number(destBal.availableQty)).toBe(20);

    // Verify TRANSFER_IN movement record
    const [inMovement] = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceId, transfer.transferNumber),
          eq(inventoryMovements.movementType, 'TRANSFER_IN')
        )
      );
    expect(inMovement).toBeDefined();
    expect(inMovement.warehouseId).toBe(destWarehouseId);
    expect(Number(inMovement.quantity)).toBe(20);
    expect(Number(inMovement.balanceBefore)).toBe(0);
    expect(Number(inMovement.balanceAfter)).toBe(20);

    // Reject duplicate receive
    await expect(receiveTransfer(transfer.id)).rejects.toThrow(/already been received/i);

    // Verify idempotent key call returns successfully without duplicating stock
    const idempotentCall = await receiveTransfer(transfer.id, {
      idempotencyKey: 'IDEMP-RECV-KEY-001',
    });
    expect(idempotentCall.alreadyProcessed).toBe(true);

    const [destBalAfter] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, destWarehouseId),
          eq(inventoryBalances.productId, productBId)
        )
      );
    expect(Number(destBalAfter.onHandQty)).toBe(20);
  });

  it('prevents overselling during concurrent transfer dispatches against the same source stock', async () => {
    // Current Product B at source: 40 - 20 = 20 on hand, available = 20.
    // Create two concurrent transfers each requesting 15 units (total 30 > 20 available).
    const t1 = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      items: [{ productId: productBId, quantity: 15 }],
    });
    createdTransferIds.push(t1.id);

    const t2 = await createTransfer({
      sourceWarehouseId,
      destinationWarehouseId: destWarehouseId,
      items: [{ productId: productBId, quantity: 15 }],
    });
    createdTransferIds.push(t2.id);

    // Execute dispatches concurrently
    const results = await Promise.allSettled([dispatchTransfer(t1.id), dispatchTransfer(t2.id)]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Exactly one must succeed, and one must fail with Insufficient stock
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // Verify source balance remains consistent (20 - 15 = 5 units)
    const [sourceBalB] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, sourceWarehouseId),
          eq(inventoryBalances.productId, productBId)
        )
      );
    expect(Number(sourceBalB.onHandQty)).toBe(5);
    expect(Number(sourceBalB.availableQty)).toBe(5);
  });
});
