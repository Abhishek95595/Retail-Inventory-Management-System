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
  salesOrders,
  salesOrderItems,
  stockReservations,
} from '@/backend/db/schema';
import {
  createSalesOrder,
  confirmSalesOrder,
  pickSalesOrder,
  packSalesOrder,
  dispatchSalesOrder,
  deliverSalesOrder,
  cancelSalesOrder,
  getSalesOrderById,
} from '@/backend/server/orders';
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

describe('RIMS Sales Order Management & Stock Reservations Integration Tests', () => {
  let sql: postgres.Sql;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  let warehouseId: string;
  let categoryId: string;
  let productAId: string;
  let productBId: string;
  let archivedProductId: string;
  let createdAdminUser = false;

  const createdSalesOrderIds: string[] = [];

  beforeAll(async () => {
    const verified = await getVerifiedTestDb();
    sql = verified.sql;
    db = verified.db;
    createdAdminUser = await ensureTestAdminUser(db);

    const ts = Date.now();

    // 1. Create fulfillment warehouse
    const [wh] = await db
      .insert(warehouses)
      .values({
        code: `WH-ORD-${ts}`,
        name: `Orders Fulfillment Warehouse ${ts}`,
        isActive: true,
      })
      .returning();
    warehouseId = wh.id;

    // 2. Create category and products
    const [cat] = await db
      .insert(categories)
      .values({
        code: `CAT-ORD-${ts}`,
        name: `Order Category ${ts}`,
      })
      .returning();
    categoryId = cat.id;

    const [pA] = await db
      .insert(products)
      .values({
        sku: `SKU-ORD-A-${ts}`,
        name: `Order Product A ${ts}`,
        categoryId,
        uom: 'EACH',
        sellingPrice: '50.0000',
        isArchived: false,
      })
      .returning();
    productAId = pA.id;

    const [pB] = await db
      .insert(products)
      .values({
        sku: `SKU-ORD-B-${ts}`,
        name: `Order Product B ${ts}`,
        categoryId,
        uom: 'EACH',
        sellingPrice: '100.0000',
        isArchived: false,
      })
      .returning();
    productBId = pB.id;

    const [pArch] = await db
      .insert(products)
      .values({
        sku: `SKU-ORD-ARCH-${ts}`,
        name: `Archived Order Product ${ts}`,
        categoryId,
        uom: 'EACH',
        sellingPrice: '25.0000',
        isArchived: true,
      })
      .returning();
    archivedProductId = pArch.id;

    // 3. Seed initial inventory balances
    // Product A: 50 on hand, 0 reserved, 0 quarantined -> 50 available
    await db.insert(inventoryBalances).values({
      warehouseId,
      productId: productAId,
      onHandQty: '50.00',
      reservedQty: '0.00',
      quarantinedQty: '0.00',
    });

    // Product B: 20 on hand, 0 reserved, 0 quarantined -> 20 available
    await db.insert(inventoryBalances).values({
      warehouseId,
      productId: productBId,
      onHandQty: '20.00',
      reservedQty: '0.00',
      quarantinedQty: '0.00',
    });
  });

  afterAll(async () => {
    try {
      if (createdSalesOrderIds.length > 0) {
        await db
          .delete(stockReservations)
          .where(inArray(stockReservations.salesOrderId, createdSalesOrderIds));
        await db
          .delete(salesOrderItems)
          .where(inArray(salesOrderItems.salesOrderId, createdSalesOrderIds));
        await db
          .delete(salesOrders)
          .where(inArray(salesOrders.id, createdSalesOrderIds));
      }
      if (warehouseId) {
        await db
          .delete(inventoryMovements)
          .where(eq(inventoryMovements.warehouseId, warehouseId));
        await db.delete(inventoryBalances).where(eq(inventoryBalances.warehouseId, warehouseId));
      }
      if (categoryId) {
        await db.delete(products).where(eq(products.categoryId, categoryId));
        await db.delete(categories).where(eq(categories.id, categoryId));
      }
      if (warehouseId) {
        await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
      }
      await cleanupTestAdminUser(db, createdAdminUser);
      if (sql) {
        await sql.end({ timeout: 2 });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  it('creates draft sales order with pricing snapshots and prevents archived products', async () => {
    // Reject archived product
    await expect(
      createSalesOrder({
        warehouseId,
        customerName: 'Acme Test Customer',
        items: [{ productId: archivedProductId, quantity: 2 }],
      })
    ).rejects.toThrow(/archived/i);

    // Create valid draft order
    const order = await createSalesOrder({
      warehouseId,
      customerName: 'Acme Corp',
      customerEmail: 'buyer@acme.com',
      items: [
        { productId: productAId, quantity: 10, unitPrice: 50.0 }, // 10 * 50 = 500
        { productId: productBId, quantity: 2, unitPrice: 100.0 }, // 2 * 100 = 200
      ],
    });
    createdSalesOrderIds.push(order.id);

    expect(order).toBeDefined();
    expect(order.orderNumber).toMatch(/^SO-\d{8}-\d{4}$/);
    expect(order.status).toBe('DRAFT');
    expect(Number(order.totalAmount)).toBe(700);

    const detail = await getSalesOrderById(order.id);
    expect(detail).toBeDefined();
    expect(detail?.itemCount).toBe(2);
    expect(detail?.items.length).toBe(2);
    expect(detail?.reservations.length).toBe(0);
  });

  it('confirms order and atomically reserves stock, decreasing available_qty via generated column', async () => {
    // Product A: 50 available. Product B: 20 available.
    const order = await createSalesOrder({
      warehouseId,
      customerName: 'Beta Retail',
      items: [
        { productId: productAId, quantity: 15 },
        { productId: productBId, quantity: 5 },
      ],
    });
    createdSalesOrderIds.push(order.id);

    const confirmResult = await confirmSalesOrder(order.id);
    expect(confirmResult.status).toBe('CONFIRMED');

    // Verify inventory balances after reservation:
    // Product A: on_hand=50, reserved=15, available=35
    const [balA] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(balA.onHandQty)).toBe(50);
    expect(Number(balA.reservedQty)).toBe(15);
    expect(Number(balA.availableQty)).toBe(35);

    // Product B: on_hand=20, reserved=5, available=15
    const [balB] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productBId)
        )
      );
    expect(Number(balB.onHandQty)).toBe(20);
    expect(Number(balB.reservedQty)).toBe(5);
    expect(Number(balB.availableQty)).toBe(15);

    // Verify stock reservations table entries
    const reservations = await db
      .select()
      .from(stockReservations)
      .where(
        and(eq(stockReservations.salesOrderId, order.id), eq(stockReservations.status, 'ACTIVE'))
      );
    expect(reservations.length).toBe(2);

    // Reject double confirmation
    await expect(confirmSalesOrder(order.id)).rejects.toThrow(/already been confirmed/i);
  });

  it('rejects order confirmation when requested quantity exceeds available stock and rolls back completely', async () => {
    // Current available: Product A = 35. Request 40 units -> must fail
    const excessiveOrder = await createSalesOrder({
      warehouseId,
      customerName: 'Excessive Buyer',
      items: [{ productId: productAId, quantity: 40 }],
    });
    createdSalesOrderIds.push(excessiveOrder.id);

    await expect(confirmSalesOrder(excessiveOrder.id)).rejects.toThrow(
      /Insufficient available stock/i
    );

    // Verify order remains DRAFT
    const checkOrder = await getSalesOrderById(excessiveOrder.id);
    expect(checkOrder?.status).toBe('DRAFT');

    // Verify balance unchanged (reserved still 15, available still 35)
    const [balA] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(balA.reservedQty)).toBe(15);
    expect(Number(balA.availableQty)).toBe(35);
  });

  it('cancels confirmed order and releases reservations, restoring available_qty', async () => {
    // Reserve 10 units of Product A
    const order = await createSalesOrder({
      warehouseId,
      customerName: 'Cancel Me',
      items: [{ productId: productAId, quantity: 10 }],
    });
    createdSalesOrderIds.push(order.id);

    await confirmSalesOrder(order.id);

    // Reserved is now 15 + 10 = 25; Available is 25
    let [balA] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(balA.reservedQty)).toBe(25);
    expect(Number(balA.availableQty)).toBe(25);

    // Cancel order
    const cancelResult = await cancelSalesOrder(order.id, { reason: 'Customer changed mind' });
    expect(cancelResult.status).toBe('CANCELLED');

    // Verify reservation released and available_qty restored (reserved back to 15, available back to 35)
    [balA] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(balA.reservedQty)).toBe(15);
    expect(Number(balA.availableQty)).toBe(35);

    // Verify reservation status marked as RELEASED
    const releasedRes = await db
      .select()
      .from(stockReservations)
      .where(eq(stockReservations.salesOrderId, order.id));
    expect(releasedRes.every((r) => r.status === 'RELEASED')).toBe(true);
  });

  it('follows full fulfillment lifecycle: Pick -> Pack -> Dispatch -> Deliver, deducting on_hand and fulfilling reservations', async () => {
    // Current Product A: on_hand=50, reserved=15, available=35
    const order = await createSalesOrder({
      warehouseId,
      customerName: 'Full Flow Customer',
      items: [{ productId: productAId, quantity: 10 }],
    });
    createdSalesOrderIds.push(order.id);

    await confirmSalesOrder(order.id);
    // reserved becomes 25, available becomes 25

    // 1. Pick
    const pickRes = await pickSalesOrder(order.id);
    expect(pickRes.status).toBe('PICKING');

    // 2. Pack
    const packRes = await packSalesOrder(order.id);
    expect(packRes.status).toBe('PACKED');

    // 3. Dispatch: deducts on_hand by 10, deducts reserved by 10
    const dispatchRes = await dispatchSalesOrder(order.id);
    expect(dispatchRes.status).toBe('DISPATCHED');

    // Verify balance after dispatch:
    // on_hand: 50 - 10 = 40
    // reserved: 25 - 10 = 15
    // available: 40 - 15 = 25 (available does not decrease upon dispatch because it was already reserved!)
    const [balA] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(balA.onHandQty)).toBe(40);
    expect(Number(balA.reservedQty)).toBe(15);
    expect(Number(balA.availableQty)).toBe(25);

    // Verify DISPATCH movement ledger entry
    const [dispatchMov] = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceId, order.orderNumber),
          eq(inventoryMovements.movementType, 'DISPATCH')
        )
      );
    expect(dispatchMov).toBeDefined();
    expect(Number(dispatchMov.quantity)).toBe(10);
    expect(Number(dispatchMov.balanceBefore)).toBe(50);
    expect(Number(dispatchMov.balanceAfter)).toBe(40);

    // 4. Deliver
    const deliverRes = await deliverSalesOrder(order.id);
    expect(deliverRes.status).toBe('DELIVERED');

    // Verify inventory balances remain unchanged after delivery
    const [balAfterDelivery] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(balAfterDelivery.onHandQty)).toBe(40);

    // Delivered orders cannot be cancelled
    await expect(cancelSalesOrder(order.id)).rejects.toThrow(
      /Cannot cancel order in 'DELIVERED' status/i
    );
  });

  it('prevents overselling during concurrent order confirmations competing for the same available stock', async () => {
    // Current available Product B: on_hand=20, reserved=5 -> available = 15.
    // Create two concurrent orders requesting 10 units each (total 20 > 15 available).
    const o1 = await createSalesOrder({
      warehouseId,
      customerName: 'Concurrent Buyer 1',
      items: [{ productId: productBId, quantity: 10 }],
    });
    createdSalesOrderIds.push(o1.id);

    const o2 = await createSalesOrder({
      warehouseId,
      customerName: 'Concurrent Buyer 2',
      items: [{ productId: productBId, quantity: 10 }],
    });
    createdSalesOrderIds.push(o2.id);

    const results = await Promise.allSettled([confirmSalesOrder(o1.id), confirmSalesOrder(o2.id)]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Exactly one order must succeed in reserving stock, while the other fails with Insufficient stock
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // Verify balance remains consistent:
    // reserved = 5 + 10 = 15, available = 20 - 15 = 5
    const [balB] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productBId)
        )
      );
    expect(Number(balB.reservedQty)).toBe(15);
    expect(Number(balB.availableQty)).toBe(5);
  });
});
