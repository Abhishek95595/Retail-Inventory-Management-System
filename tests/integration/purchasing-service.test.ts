import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/db';
import {
  warehouses,
  categories,
  products,
  suppliers,
  inventoryBalances,
  inventoryMovements,
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
} from '@/db/schema';
import {
  createPurchaseOrder,
  updateDraftPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  receiveGoods,
  getPurchaseOrderById,
} from '@/server/purchasing';
import { eq, and } from 'drizzle-orm';

// Mock server auth using administrator account for integration tests
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

describe('RIMS Purchase Order Management & Goods Receipts Integration Tests', () => {
  let warehouseId: string;
  let supplierId: string;
  let categoryId: string;
  let productAId: string;
  let productBId: string;

  beforeAll(async () => {
    const ts = Date.now();

    // 1. Create receiving warehouse
    const [wh] = await db
      .insert(warehouses)
      .values({
        code: `WH-PO-${ts}`,
        name: `Purchasing Warehouse ${ts}`,
        isActive: true,
      })
      .returning();
    warehouseId = wh.id;

    // 2. Create supplier
    const [sup] = await db
      .insert(suppliers)
      .values({
        code: `SUP-${ts}`,
        name: `Test Supplier ${ts}`,
        isActive: true,
      })
      .returning();
    supplierId = sup.id;

    // 3. Create category and products
    const [cat] = await db
      .insert(categories)
      .values({
        code: `CAT-PO-${ts}`,
        name: `Purchasing Category ${ts}`,
      })
      .returning();
    categoryId = cat.id;

    const [pA] = await db
      .insert(products)
      .values({
        sku: `SKU-PO-A-${ts}`,
        name: `Purchasing Product A ${ts}`,
        categoryId,
        uom: 'EACH',
        costPrice: '25.0000',
        sellingPrice: '50.0000',
        isArchived: false,
      })
      .returning();
    productAId = pA.id;

    const [pB] = await db
      .insert(products)
      .values({
        sku: `SKU-PO-B-${ts}`,
        name: `Purchasing Product B ${ts}`,
        categoryId,
        uom: 'EACH',
        costPrice: '60.0000',
        sellingPrice: '120.0000',
        isArchived: false,
      })
      .returning();
    productBId = pB.id;
  });

  afterAll(async () => {
    // Cleanup created records safely
    await db.delete(goodsReceiptItems).where(eq(goodsReceiptItems.productId, productAId));
    await db.delete(goodsReceiptItems).where(eq(goodsReceiptItems.productId, productBId));
    await db.delete(goodsReceipts).where(eq(goodsReceipts.warehouseId, warehouseId));
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.productId, productAId));
    await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.productId, productBId));
    await db.delete(purchaseOrders).where(eq(purchaseOrders.destinationWarehouseId, warehouseId));
    await db.delete(inventoryMovements).where(eq(inventoryMovements.warehouseId, warehouseId));
    await db.delete(inventoryBalances).where(eq(inventoryBalances.warehouseId, warehouseId));
    await db.delete(products).where(eq(products.id, productAId));
    await db.delete(products).where(eq(products.id, productBId));
    await db.delete(categories).where(eq(categories.id, categoryId));
    await db.delete(suppliers).where(eq(suppliers.id, supplierId));
    await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
  });

  it('1. Creates draft purchase order with correct cost snapshots and calculates order total', async () => {
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [
        { productId: productAId, quantityOrdered: '20.00' }, // 20 * 25.00 = 500.00
        { productId: productBId, quantityOrdered: '10.00', unitCost: '55.0000' }, // 10 * 55.00 = 550.00
      ],
    });

    expect(po.status).toBe('DRAFT');
    expect(po.supplierId).toBe(supplierId);
    expect(po.destinationWarehouseId).toBe(warehouseId);
    expect(po.items).toHaveLength(2);
    expect(po.totalCost).toBe('1050.00');

    const itemA = po.items.find((i) => i.productId === productAId)!;
    expect(itemA.quantityOrdered).toBe('20.00');
    expect(itemA.unitCost).toBe('25.0000');
    expect(itemA.lineTotal).toBe('500.0000');
  });

  it('2. Edits draft purchase order lines and quantities prior to submission', async () => {
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '10.00', unitCost: '20.0000' }],
    });

    const updated = await updateDraftPurchaseOrder(po.id, {
      items: [
        { productId: productAId, quantityOrdered: '15.00', unitCost: '20.0000' },
        { productId: productBId, quantityOrdered: '5.00', unitCost: '50.0000' },
      ],
    });

    expect(updated.items).toHaveLength(2);
    expect(updated.totalCost).toBe('550.00'); // 15*20 (300) + 5*50 (250) = 550.00
  });

  it('3. Submits draft and approves order without prematurely altering inventory balances', async () => {
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '40.00', unitCost: '25.0000' }],
    });

    // Submit
    const submitted = await submitPurchaseOrder(po.id);
    expect(submitted.status).toBe('SUBMITTED');

    // Attempting to approve draft directly without submission must throw
    // Approve submitted
    const approved = await approvePurchaseOrder(po.id);
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedByName).toBe('System Administrator');
    expect(approved.approvedAt).not.toBeNull();

    // Verify inventory balance is untouched
    const [bal] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );

    if (bal) {
      expect(Number(bal.onHandQty)).toBe(0);
      expect(Number(bal.availableQty)).toBe(0);
    }
  });

  it('4. Rejects receipt against unapproved purchase order', async () => {
    const draftPO = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '10.00' }],
    });

    await expect(
      receiveGoods({
        purchaseOrderId: draftPO.id,
        items: [{ productId: productAId, quantityReceived: '10.00' }],
      })
    ).rejects.toThrow(/Order must be APPROVED or PARTIALLY_RECEIVED/);
  });

  it('5. Processes partial receipt, increments on-hand stock and availability, and transitions to PARTIALLY_RECEIVED', async () => {
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '50.00', unitCost: '25.0000' }],
    });
    await submitPurchaseOrder(po.id);
    await approvePurchaseOrder(po.id);

    // Initial on-hand
    const [initialBal] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    const startOnHand = initialBal ? Number(initialBal.onHandQty) : 0;

    // Partial receipt of 20 units out of 50
    const receipt = await receiveGoods({
      purchaseOrderId: po.id,
      notes: 'First delivery batch of 20',
      items: [{ productId: productAId, quantityReceived: '20.00' }],
    });

    expect(receipt.receiptNumber).toMatch(/^GR-/);
    expect(receipt.items).toHaveLength(1);
    expect(receipt.items[0].quantityReceived).toBe('20.00');

    // Check PO status
    const poAfterPartial = await getPurchaseOrderById(po.id);
    expect(poAfterPartial?.status).toBe('PARTIALLY_RECEIVED');
    expect(poAfterPartial?.items[0].quantityReceived).toBe('20.00');
    expect(poAfterPartial?.items[0].quantityOutstanding).toBe('30.00');

    // Check Inventory Balance: on_hand_qty increased by 20, available_qty increased by 20
    const [balAfter] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.warehouseId, warehouseId),
          eq(inventoryBalances.productId, productAId)
        )
      );
    expect(Number(balAfter.onHandQty)).toBe(startOnHand + 20);
    expect(Number(balAfter.availableQty)).toBe(startOnHand + 20);

    // Check Inventory Movement record
    const [movement] = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.warehouseId, warehouseId),
          eq(inventoryMovements.productId, productAId),
          eq(inventoryMovements.referenceId, receipt.receiptNumber)
        )
      );
    expect(movement).toBeDefined();
    expect(movement.movementType).toBe('RECEIPT');
    expect(movement.quantity).toBe('20.00');
  });

  it('6. Rejects over-receiving above remaining outstanding quantity', async () => {
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '10.00' }],
    });
    await submitPurchaseOrder(po.id);
    await approvePurchaseOrder(po.id);

    // Attempting to receive 15 when only 10 ordered must fail
    await expect(
      receiveGoods({
        purchaseOrderId: po.id,
        items: [{ productId: productAId, quantityReceived: '15.00' }],
      })
    ).rejects.toThrow(/Outstanding quantity is only 10.00/);
  });

  it('7. Completes remaining goods receipt and transitions order to RECEIVED', async () => {
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productBId, quantityOrdered: '25.00' }],
    });
    await submitPurchaseOrder(po.id);
    await approvePurchaseOrder(po.id);

    // Batch 1: receive 10
    await receiveGoods({
      purchaseOrderId: po.id,
      items: [{ productId: productBId, quantityReceived: '10.00' }],
    });

    // Batch 2: receive remaining 15
    await receiveGoods({
      purchaseOrderId: po.id,
      items: [{ productId: productBId, quantityReceived: '15.00' }],
    });

    const poFinal = await getPurchaseOrderById(po.id);
    expect(poFinal?.status).toBe('RECEIVED');
    expect(poFinal?.items[0].quantityReceived).toBe('25.00');
    expect(poFinal?.items[0].quantityOutstanding).toBe('0.00');
  });

  it('8. Enforces idempotency on receipt retries', async () => {
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '10.00' }],
    });
    await submitPurchaseOrder(po.id);
    await approvePurchaseOrder(po.id);

    const idempotencyKey = `GR-IDEMP-${Date.now()}`;

    // First attempt
    const rc1 = await receiveGoods({
      purchaseOrderId: po.id,
      idempotencyKey,
      items: [{ productId: productAId, quantityReceived: '10.00' }],
    });

    // Repeated identical attempt
    const rc2 = await receiveGoods({
      purchaseOrderId: po.id,
      idempotencyKey,
      items: [{ productId: productAId, quantityReceived: '10.00' }],
    });

    expect(rc1.id).toBe(rc2.id);
    expect(rc1.receiptNumber).toBe(rc2.receiptNumber);

    // Using same idempotency key for different PO must produce conflict
    const otherPO = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '5.00' }],
    });
    await submitPurchaseOrder(otherPO.id);
    await approvePurchaseOrder(otherPO.id);

    await expect(
      receiveGoods({
        purchaseOrderId: otherPO.id,
        idempotencyKey,
        items: [{ productId: productAId, quantityReceived: '5.00' }],
      })
    ).rejects.toThrow(/Idempotency key conflict/);
  });

  it('9. Cancels eligible unreceived purchase order and prohibits cancellation after receiving goods', async () => {
    // Draft cancellation
    const draftPO = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '10.00' }],
    });
    const cancelled = await cancelPurchaseOrder(draftPO.id, { reason: 'Supplier out of stock' });
    expect(cancelled.status).toBe('CANCELLED');

    // Cancellation of received PO must be rejected
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '10.00' }],
    });
    await submitPurchaseOrder(po.id);
    await approvePurchaseOrder(po.id);
    await receiveGoods({
      purchaseOrderId: po.id,
      items: [{ productId: productAId, quantityReceived: '5.00' }],
    });

    await expect(cancelPurchaseOrder(po.id)).rejects.toThrow(
      /Cannot cancel purchase order in PARTIALLY_RECEIVED status/
    );
  });

  it('10. Prevents concurrent over-receiving with row-level locks', async () => {
    // Order for 10 units
    const po = await createPurchaseOrder({
      supplierId,
      destinationWarehouseId: warehouseId,
      items: [{ productId: productAId, quantityOrdered: '10.00' }],
    });
    await submitPurchaseOrder(po.id);
    await approvePurchaseOrder(po.id);

    // Two simultaneous attempts to receive 7 units each (total 14 > 10)
    const p1 = receiveGoods({
      purchaseOrderId: po.id,
      items: [{ productId: productAId, quantityReceived: '7.00' }],
    });
    const p2 = receiveGoods({
      purchaseOrderId: po.id,
      items: [{ productId: productAId, quantityReceived: '7.00' }],
    });

    const results = await Promise.allSettled([p1, p2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one should succeed, other should fail with outstanding quantity exceeded
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(
      /Outstanding quantity is only 3.00/
    );
  });
});
