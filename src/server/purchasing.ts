import { db } from '@/db';
import {
  purchaseOrders,
  purchaseOrderItems,
  goodsReceipts,
  goodsReceiptItems,
  inventoryBalances,
  inventoryMovements,
  warehouses,
  products,
  suppliers,
  users,
} from '@/db/schema';
import { eq, and, or, ilike, desc, SQL, sql, inArray } from 'drizzle-orm';
import { requirePermission } from '@/server/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLog } from '@/server/audit';
import {
  CreatePurchaseOrderInput,
  UpdateDraftPurchaseOrderInput,
  CancelPurchaseOrderInput,
  QueryPurchaseOrdersInput,
  CreateGoodsReceiptInput,
  QueryGoodsReceiptsInput,
} from '@/lib/validations/purchasing';

/**
 * Decimal addition ensuring 2 decimal places precision.
 */
function addDecimals(a: string | number, b: string | number): string {
  const sum = (Math.round(Number(a) * 100) + Math.round(Number(b) * 100)) / 100;
  return sum.toFixed(2);
}

/**
 * Decimal money multiplication (quantity * unitCost) to 4 decimal places precision.
 */
function multiplyMoney(qty: string | number, price: string | number): string {
  const total = Number(qty) * Number(price);
  return total.toFixed(4);
}

export interface PurchaseOrderListItem {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  destinationWarehouseCode: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  totalCost: string;
  expectedArrivalDate: string | null;
  itemCount: number;
  totalQuantityOrdered: string;
  totalQuantityReceived: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderDetailItem extends PurchaseOrderListItem {
  createdByName: string | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    quantityOrdered: string;
    quantityReceived: string;
    quantityOutstanding: string;
    unitCost: string;
    lineTotal: string;
  }>;
  receipts: Array<{
    id: string;
    receiptNumber: string;
    receivedByName: string | null;
    receivedAt: Date;
    notes: string | null;
  }>;
}

export interface PaginatedPurchaseOrders {
  items: PurchaseOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GoodsReceiptListItem {
  id: string;
  receiptNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  receivedByName: string | null;
  notes: string | null;
  receivedAt: Date;
  itemCount: number;
  totalQuantityReceived: string;
}

export interface GoodsReceiptDetailItem extends GoodsReceiptListItem {
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    quantityReceived: string;
    unitCost: string;
  }>;
}

export interface PaginatedGoodsReceipts {
  items: GoodsReceiptListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query purchase orders with pagination, status, supplier, warehouse filters, and search.
 */
export async function getPurchaseOrders(
  filters: Partial<QueryPurchaseOrdersInput> = {}
): Promise<PaginatedPurchaseOrders> {
  await requirePermission(PERMISSIONS.PURCHASING_READ);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(purchaseOrders.status, filters.status));
  }
  if (filters.supplierId) {
    conditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
  }
  if (filters.warehouseId) {
    conditions.push(eq(purchaseOrders.destinationWarehouseId, filters.warehouseId));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(purchaseOrders.poNumber, term),
        ilike(suppliers.name, term),
        ilike(suppliers.code, term),
        ilike(warehouses.name, term),
        ilike(warehouses.code, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${purchaseOrders.id})::int` })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(purchaseOrders.destinationWarehouseId, warehouses.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      supplierCode: suppliers.code,
      destinationWarehouseId: purchaseOrders.destinationWarehouseId,
      destinationWarehouseName: warehouses.name,
      destinationWarehouseCode: warehouses.code,
      status: purchaseOrders.status,
      totalCost: purchaseOrders.totalCost,
      expectedArrivalDate: purchaseOrders.expectedArrivalDate,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      itemCount: sql<number>`count(${purchaseOrderItems.id})::int`,
      totalQuantityOrdered: sql<string>`coalesce(sum(${purchaseOrderItems.quantityOrdered}), 0)::text`,
      totalQuantityReceived: sql<string>`coalesce(sum(${purchaseOrderItems.quantityReceived}), 0)::text`,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(purchaseOrders.destinationWarehouseId, warehouses.id))
    .leftJoin(purchaseOrderItems, eq(purchaseOrders.id, purchaseOrderItems.purchaseOrderId))
    .where(whereClause)
    .groupBy(
      purchaseOrders.id,
      purchaseOrders.poNumber,
      purchaseOrders.supplierId,
      suppliers.name,
      suppliers.code,
      purchaseOrders.destinationWarehouseId,
      warehouses.name,
      warehouses.code,
      purchaseOrders.status,
      purchaseOrders.totalCost,
      purchaseOrders.expectedArrivalDate,
      purchaseOrders.createdAt,
      purchaseOrders.updatedAt
    )
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map((r) => ({
      id: r.id,
      poNumber: r.poNumber,
      supplierId: r.supplierId,
      supplierName: r.supplierName || 'Unknown Supplier',
      supplierCode: r.supplierCode || 'UNK',
      destinationWarehouseId: r.destinationWarehouseId,
      destinationWarehouseName: r.destinationWarehouseName || 'Unknown Warehouse',
      destinationWarehouseCode: r.destinationWarehouseCode || 'UNK',
      status: r.status,
      totalCost: Number(r.totalCost).toFixed(2),
      expectedArrivalDate: r.expectedArrivalDate,
      itemCount: r.itemCount,
      totalQuantityOrdered: Number(r.totalQuantityOrdered).toFixed(2),
      totalQuantityReceived: Number(r.totalQuantityReceived).toFixed(2),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit) || 1,
  };
}

/**
 * Retrieve a single purchase order by ID with line items and goods receipts history.
 */
export async function getPurchaseOrderById(id: string): Promise<PurchaseOrderDetailItem | null> {
  await requirePermission(PERMISSIONS.PURCHASING_READ);

  const [po] = await db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      supplierCode: suppliers.code,
      destinationWarehouseId: purchaseOrders.destinationWarehouseId,
      destinationWarehouseName: warehouses.name,
      destinationWarehouseCode: warehouses.code,
      status: purchaseOrders.status,
      totalCost: purchaseOrders.totalCost,
      expectedArrivalDate: purchaseOrders.expectedArrivalDate,
      createdBy: purchaseOrders.createdBy,
      approvedBy: purchaseOrders.approvedBy,
      approvedAt: purchaseOrders.approvedAt,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(purchaseOrders.destinationWarehouseId, warehouses.id))
    .where(eq(purchaseOrders.id, id))
    .limit(1);

  if (!po) return null;

  // Retrieve creator and approver user names
  let createdByName: string | null = null;
  if (po.createdBy) {
    const [u] = await db
      .select({ name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})` })
      .from(users)
      .where(eq(users.id, po.createdBy))
      .limit(1);
    createdByName = u?.name || null;
  }

  let approvedByName: string | null = null;
  if (po.approvedBy) {
    const [u] = await db
      .select({ name: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})` })
      .from(users)
      .where(eq(users.id, po.approvedBy))
      .limit(1);
    approvedByName = u?.name || null;
  }

  // Retrieve line items
  const items = await db
    .select({
      id: purchaseOrderItems.id,
      productId: purchaseOrderItems.productId,
      productName: products.name,
      sku: products.sku,
      uom: products.uom,
      quantityOrdered: purchaseOrderItems.quantityOrdered,
      quantityReceived: purchaseOrderItems.quantityReceived,
      unitCost: purchaseOrderItems.unitCost,
      lineTotal: purchaseOrderItems.lineTotal,
    })
    .from(purchaseOrderItems)
    .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
    .where(eq(purchaseOrderItems.purchaseOrderId, id));

  // Retrieve receipts history
  const receipts = await db
    .select({
      id: goodsReceipts.id,
      receiptNumber: goodsReceipts.receiptNumber,
      receivedBy: goodsReceipts.receivedBy,
      receivedAt: goodsReceipts.receivedAt,
      notes: goodsReceipts.notes,
      receivedByName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
    })
    .from(goodsReceipts)
    .leftJoin(users, eq(goodsReceipts.receivedBy, users.id))
    .where(eq(goodsReceipts.purchaseOrderId, id))
    .orderBy(desc(goodsReceipts.receivedAt));

  let totalQtyOrd = 0;
  let totalQtyRec = 0;

  const formattedItems = items.map((i) => {
    const ord = Number(i.quantityOrdered);
    const rec = Number(i.quantityReceived);
    totalQtyOrd += ord;
    totalQtyRec += rec;
    const outstanding = Math.max(0, ord - rec);

    return {
      id: i.id,
      productId: i.productId,
      productName: i.productName || 'Unknown Product',
      sku: i.sku || 'UNK',
      uom: i.uom || 'EACH',
      quantityOrdered: ord.toFixed(2),
      quantityReceived: rec.toFixed(2),
      quantityOutstanding: outstanding.toFixed(2),
      unitCost: Number(i.unitCost).toFixed(4),
      lineTotal: Number(i.lineTotal).toFixed(4),
    };
  });

  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName || 'Unknown Supplier',
    supplierCode: po.supplierCode || 'UNK',
    destinationWarehouseId: po.destinationWarehouseId,
    destinationWarehouseName: po.destinationWarehouseName || 'Unknown Warehouse',
    destinationWarehouseCode: po.destinationWarehouseCode || 'UNK',
    status: po.status,
    totalCost: Number(po.totalCost).toFixed(2),
    expectedArrivalDate: po.expectedArrivalDate,
    itemCount: formattedItems.length,
    totalQuantityOrdered: totalQtyOrd.toFixed(2),
    totalQuantityReceived: totalQtyRec.toFixed(2),
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
    createdByName,
    approvedByName,
    approvedAt: po.approvedAt,
    items: formattedItems,
    receipts: receipts.map((rc) => ({
      id: rc.id,
      receiptNumber: rc.receiptNumber,
      receivedByName: rc.receivedByName || null,
      receivedAt: rc.receivedAt,
      notes: rc.notes || null,
    })),
  };
}

/**
 * Create a new Purchase Order in DRAFT status.
 */
export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput
): Promise<PurchaseOrderDetailItem> {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_ORDER_CREATE);

  // 1. Validate Supplier
  const [supplier] = await db
    .select()
    .from(suppliers)
    .where(eq(suppliers.id, input.supplierId))
    .limit(1);

  if (!supplier) {
    throw new Error('Specified supplier does not exist.');
  }
  if (!supplier.isActive) {
    throw new Error('Cannot issue purchase orders to an inactive supplier.');
  }

  // 2. Validate Destination Warehouse
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, input.destinationWarehouseId))
    .limit(1);

  if (!warehouse) {
    throw new Error('Destination warehouse does not exist.');
  }
  if (!warehouse.isActive) {
    throw new Error('Cannot designate an inactive warehouse as purchase destination.');
  }

  // 3. Validate Products and snapshot costs
  const productIds = input.items.map((i) => i.productId);
  const matchedProducts = await db.select().from(products).where(inArray(products.id, productIds));

  if (matchedProducts.length !== productIds.length) {
    throw new Error('One or more selected products do not exist in the catalog.');
  }

  for (const p of matchedProducts) {
    if (p.isArchived) {
      throw new Error(`Product ${p.sku} (${p.name}) is archived and cannot be ordered.`);
    }
  }

  const prodMap = new Map(matchedProducts.map((p) => [p.id, p]));

  // Calculate line items with snapshot costs and server-calculated totals
  let grandTotalCost = 0;
  const lineItemsToInsert = input.items.map((item) => {
    const prod = prodMap.get(item.productId)!;
    // Snapshot unit cost: input cost or product catalog costPrice or fallback 0
    const costToUse = item.unitCost ? Number(item.unitCost) : Number(prod.costPrice || '0.0000');
    const qty = Number(item.quantityOrdered);
    const lineTotal = Number(multiplyMoney(qty, costToUse));
    grandTotalCost += lineTotal;

    return {
      productId: item.productId,
      quantityOrdered: qty.toFixed(2),
      quantityReceived: '0.00',
      unitCost: costToUse.toFixed(4),
      lineTotal: lineTotal.toFixed(4),
    };
  });

  const poNumber = `PO-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const createdPO = await db.transaction(async (tx) => {
    const [po] = await tx
      .insert(purchaseOrders)
      .values({
        poNumber,
        supplierId: input.supplierId,
        destinationWarehouseId: input.destinationWarehouseId,
        status: 'DRAFT',
        totalCost: grandTotalCost.toFixed(4),
        expectedArrivalDate: input.expectedArrivalDate || null,
        createdBy: actor.id,
      })
      .returning();

    for (const line of lineItemsToInsert) {
      await tx.insert(purchaseOrderItems).values({
        purchaseOrderId: po.id,
        productId: line.productId,
        quantityOrdered: line.quantityOrdered,
        quantityReceived: line.quantityReceived,
        unitCost: line.unitCost,
        lineTotal: line.lineTotal,
      });
    }

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'PURCHASE_ORDER_CREATE',
        entityType: 'PURCHASE_ORDER',
        entityId: po.id,
        newValues: {
          poNumber: po.poNumber,
          supplierId: po.supplierId,
          supplierName: supplier.name,
          destinationWarehouseId: po.destinationWarehouseId,
          destinationWarehouseCode: warehouse.code,
          totalCost: po.totalCost,
          itemCount: lineItemsToInsert.length,
        },
      },
      tx
    );

    return po;
  });

  return (await getPurchaseOrderById(createdPO.id))!;
}

/**
 * Update an existing DRAFT Purchase Order.
 */
export async function updateDraftPurchaseOrder(
  id: string,
  input: UpdateDraftPurchaseOrderInput
): Promise<PurchaseOrderDetailItem> {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_ORDER_CREATE);

  const [existingPO] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);

  if (!existingPO) {
    throw new Error('Purchase order not found.');
  }

  if (existingPO.status !== 'DRAFT') {
    throw new Error(
      `Cannot edit purchase order in ${existingPO.status} status. Only DRAFT orders can be edited.`
    );
  }

  const supplierId = input.supplierId || existingPO.supplierId;
  const destinationWarehouseId = input.destinationWarehouseId || existingPO.destinationWarehouseId;

  // Validate Supplier
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, supplierId)).limit(1);
  if (!supplier || !supplier.isActive) {
    throw new Error('Specified supplier does not exist or is inactive.');
  }

  // Validate Destination Warehouse
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, destinationWarehouseId))
    .limit(1);
  if (!warehouse || !warehouse.isActive) {
    throw new Error('Destination warehouse does not exist or is inactive.');
  }

  await db.transaction(async (tx) => {
    let grandTotalCost = Number(existingPO.totalCost);

    if (input.items && input.items.length > 0) {
      const productIds = input.items.map((i) => i.productId);
      const matchedProducts = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      if (matchedProducts.length !== productIds.length) {
        throw new Error('One or more selected products do not exist.');
      }

      for (const p of matchedProducts) {
        if (p.isArchived) {
          throw new Error(`Product ${p.sku} (${p.name}) is archived and cannot be ordered.`);
        }
      }

      const prodMap = new Map(matchedProducts.map((p) => [p.id, p]));

      grandTotalCost = 0;
      const lineItemsToInsert = input.items.map((item) => {
        const prod = prodMap.get(item.productId)!;
        const costToUse = item.unitCost
          ? Number(item.unitCost)
          : Number(prod.costPrice || '0.0000');
        const qty = Number(item.quantityOrdered);
        const lineTotal = Number(multiplyMoney(qty, costToUse));
        grandTotalCost += lineTotal;

        return {
          productId: item.productId,
          quantityOrdered: qty.toFixed(2),
          quantityReceived: '0.00',
          unitCost: costToUse.toFixed(4),
          lineTotal: lineTotal.toFixed(4),
        };
      });

      // Delete old items and insert updated lines
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

      for (const line of lineItemsToInsert) {
        await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: id,
          productId: line.productId,
          quantityOrdered: line.quantityOrdered,
          quantityReceived: line.quantityReceived,
          unitCost: line.unitCost,
          lineTotal: line.lineTotal,
        });
      }
    }

    await tx
      .update(purchaseOrders)
      .set({
        supplierId,
        destinationWarehouseId,
        expectedArrivalDate:
          input.expectedArrivalDate !== undefined
            ? input.expectedArrivalDate
            : existingPO.expectedArrivalDate,
        totalCost: grandTotalCost.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'PURCHASE_ORDER_UPDATE',
        entityType: 'PURCHASE_ORDER',
        entityId: id,
        newValues: {
          poNumber: existingPO.poNumber,
          totalCost: grandTotalCost.toFixed(4),
          supplierId,
          destinationWarehouseId,
        },
      },
      tx
    );
  });

  return (await getPurchaseOrderById(id))!;
}

/**
 * Submit a DRAFT purchase order for approval.
 * Validates DRAFT -> SUBMITTED transition.
 */
export async function submitPurchaseOrder(id: string): Promise<PurchaseOrderDetailItem> {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_ORDER_CREATE);

  await db.transaction(async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .for('update');

    if (!po) {
      throw new Error('Purchase order not found.');
    }

    if (po.status !== 'DRAFT') {
      throw new Error(
        `Cannot submit purchase order in ${po.status} status. Only DRAFT orders can be submitted.`
      );
    }

    // Verify PO has lines
    const items = await tx
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    if (items.length === 0) {
      throw new Error('Cannot submit a purchase order with zero line items.');
    }

    await tx
      .update(purchaseOrders)
      .set({
        status: 'SUBMITTED',
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'PURCHASE_ORDER_SUBMIT',
        entityType: 'PURCHASE_ORDER',
        entityId: id,
        newValues: {
          poNumber: po.poNumber,
          submittedBy: actor.id,
          totalCost: po.totalCost,
        },
      },
      tx
    );

    return po.id;
  });

  return (await getPurchaseOrderById(id))!;
}

/**
 * Approve a SUBMITTED purchase order.
 * Validates SUBMITTED -> APPROVED transition.
 * Sets approvedBy and approvedAt. Does not change inventory balances.
 */
export async function approvePurchaseOrder(id: string): Promise<PurchaseOrderDetailItem> {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_ORDER_APPROVE);

  await db.transaction(async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .for('update');

    if (!po) {
      throw new Error('Purchase order not found.');
    }

    if (po.status === 'APPROVED') {
      // Idempotent: already approved
      return (await getPurchaseOrderById(id))!;
    }

    if (po.status !== 'SUBMITTED') {
      throw new Error(
        `Cannot approve purchase order in ${po.status} status. Only SUBMITTED orders can be approved.`
      );
    }

    const now = new Date();
    await tx
      .update(purchaseOrders)
      .set({
        status: 'APPROVED',
        approvedBy: actor.id,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(purchaseOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'PURCHASE_ORDER_APPROVE',
        entityType: 'PURCHASE_ORDER',
        entityId: id,
        newValues: {
          poNumber: po.poNumber,
          approvedBy: actor.id,
          approvedAt: now.toISOString(),
        },
      },
      tx
    );

    return po.id;
  });

  return (await getPurchaseOrderById(id))!;
}

/**
 * Cancel an eligible purchase order.
 * Permitted for DRAFT, SUBMITTED, and APPROVED (with 0 received goods).
 * Prohibits cancellation of PARTIALLY_RECEIVED or RECEIVED orders.
 */
export async function cancelPurchaseOrder(
  id: string,
  input: CancelPurchaseOrderInput = {}
): Promise<PurchaseOrderDetailItem> {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_ORDER_CREATE);

  await db.transaction(async (tx) => {
    const [po] = await tx
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, id))
      .for('update');

    if (!po) {
      throw new Error('Purchase order not found.');
    }

    if (po.status === 'CANCELLED') {
      // Idempotent
      return po.id;
    }

    if (po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED') {
      throw new Error(
        `Cannot cancel purchase order in ${po.status} status. Goods have already been received into inventory.`
      );
    }

    // Verify no receipts exist
    const [receiptCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(goodsReceipts)
      .where(eq(goodsReceipts.purchaseOrderId, id));

    if (receiptCount && receiptCount.count > 0) {
      throw new Error('Cannot cancel purchase order with recorded goods receipts.');
    }

    await tx
      .update(purchaseOrders)
      .set({
        status: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'PURCHASE_ORDER_CANCEL',
        entityType: 'PURCHASE_ORDER',
        entityId: id,
        newValues: {
          poNumber: po.poNumber,
          reason: input.reason || 'Cancelled by user',
          previousStatus: po.status,
        },
      },
      tx
    );

    return po.id;
  });

  return (await getPurchaseOrderById(id))!;
}

/**
 * Receive Goods for an APPROVED or PARTIALLY_RECEIVED Purchase Order.
 *
 * Transactional Concurrency & Accounting Safeguards:
 * 1. Locks purchase order and purchase order items under FOR UPDATE.
 * 2. Checks order status is APPROVED or PARTIALLY_RECEIVED.
 * 3. Handles Idempotency Key: if receipt with matching key exists, verifies payload and returns existing receipt.
 * 4. Verifies each received item belongs to the PO and does not exceed remaining outstanding quantity.
 * 5. Locks destination inventory_balances in canonical sorted product order (SELECT ... FOR UPDATE).
 * 6. Creates zero balance row if absent via ON CONFLICT DO NOTHING.
 * 7. Increments on_hand_qty by received quantity. Leaves reserved_qty and quarantined_qty unchanged.
 *    PostgreSQL auto-computes available_qty = on_hand_qty - reserved_qty - quarantined_qty.
 * 8. Appends immutable 'RECEIPT' movement row to inventory_movements.
 * 9. Creates goods_receipts and goods_receipt_items rows.
 * 10. Updates purchase_order_items.quantityReceived.
 * 11. Transitions purchase_orders.status to 'RECEIVED' (if all lines fully received) or 'PARTIALLY_RECEIVED'.
 * 12. Appends audit log.
 */
export async function receiveGoods(
  input: CreateGoodsReceiptInput
): Promise<GoodsReceiptDetailItem> {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_RECEIVE);

  // Check idempotency first if key provided
  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(goodsReceipts)
      .where(eq(goodsReceipts.idempotencyKey, input.idempotencyKey))
      .limit(1);

    if (existing) {
      if (existing.purchaseOrderId !== input.purchaseOrderId) {
        throw new Error(
          'Idempotency key conflict: key was previously used for a different purchase order.'
        );
      }
      return (await getGoodsReceiptById(existing.id))!;
    }
  }

  return await db
    .transaction(async (tx) => {
      // 1. Lock Purchase Order
      const [po] = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.purchaseOrderId))
        .for('update');

      if (!po) {
        throw new Error('Purchase order not found.');
      }

      if (po.status !== 'APPROVED' && po.status !== 'PARTIALLY_RECEIVED') {
        throw new Error(
          `Cannot receive goods for purchase order in ${po.status} status. Order must be APPROVED or PARTIALLY_RECEIVED.`
        );
      }

      // 2. Lock Purchase Order Items
      const poItems = await tx
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, po.id))
        .for('update');

      const poItemMap = new Map(poItems.map((item) => [item.productId, item]));

      // Validate received lines against PO lines
      for (const item of input.items) {
        const poLine = poItemMap.get(item.productId);
        if (!poLine) {
          throw new Error(
            `Product ID ${item.productId} is not part of purchase order ${po.poNumber}.`
          );
        }

        const ordered = Number(poLine.quantityOrdered);
        const alreadyRec = Number(poLine.quantityReceived);
        const outstanding = Math.max(0, ordered - alreadyRec);
        const incoming = Number(item.quantityReceived);

        if (incoming <= 0) {
          throw new Error('Received quantity must be strictly greater than zero.');
        }

        if (incoming > outstanding) {
          throw new Error(
            `Cannot receive ${incoming} units for product. Outstanding quantity is only ${outstanding.toFixed(2)}.`
          );
        }
      }

      // 3. Lock destination inventory balances in canonical product_id order
      const sortedProductIds = [...new Set(input.items.map((i) => i.productId))].sort();

      // Ensure balance rows exist first
      for (const prodId of sortedProductIds) {
        await tx
          .insert(inventoryBalances)
          .values({
            warehouseId: po.destinationWarehouseId,
            productId: prodId,
            onHandQty: '0.00',
            reservedQty: '0.00',
            quarantinedQty: '0.00',
          })
          .onConflictDoNothing({
            target: [inventoryBalances.warehouseId, inventoryBalances.productId],
          });
      }

      // Lock balances in canonical order
      const lockedBalances = await tx
        .select()
        .from(inventoryBalances)
        .where(
          and(
            eq(inventoryBalances.warehouseId, po.destinationWarehouseId),
            inArray(inventoryBalances.productId, sortedProductIds)
          )
        )
        .orderBy(inventoryBalances.productId)
        .for('update');

      const balanceMap = new Map(lockedBalances.map((b) => [b.productId, b]));

      // 4. Create Goods Receipt Header
      const receiptNumber = `GR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const [receipt] = await tx
        .insert(goodsReceipts)
        .values({
          receiptNumber,
          purchaseOrderId: po.id,
          warehouseId: po.destinationWarehouseId,
          receivedBy: actor.id,
          idempotencyKey: input.idempotencyKey || null,
          notes: input.notes || null,
        })
        .returning();

      // 5. Process each received line: update inventory balance, append movement ledger, insert receipt line
      for (const item of input.items) {
        const poLine = poItemMap.get(item.productId)!;
        const balance = balanceMap.get(item.productId)!;

        const qty = item.quantityReceived;
        const unitCost = item.unitCost ? item.unitCost : poLine.unitCost;

        const beforeOnHand = balance.onHandQty;
        const afterOnHand = addDecimals(beforeOnHand, qty);

        // Update inventory balance
        await tx
          .update(inventoryBalances)
          .set({
            onHandQty: afterOnHand,
            updatedAt: new Date(),
          })
          .where(eq(inventoryBalances.id, balance.id));

        // Append immutable movement ledger row
        await tx.insert(inventoryMovements).values({
          warehouseId: po.destinationWarehouseId,
          productId: item.productId,
          movementType: 'RECEIPT',
          quantity: qty,
          balanceBefore: beforeOnHand,
          balanceAfter: afterOnHand,
          referenceType: 'PURCHASE_ORDER',
          referenceId: receipt.receiptNumber,
          actorId: actor.id,
          reason: `Goods receipt against ${po.poNumber}${input.notes ? `: ${input.notes}` : ''}`,
        });

        // Insert goods receipt item
        await tx.insert(goodsReceiptItems).values({
          goodsReceiptId: receipt.id,
          productId: item.productId,
          quantityReceived: qty,
          unitCost,
        });

        // Update PO line received quantity
        const newPoLineRec = addDecimals(poLine.quantityReceived, qty);
        await tx
          .update(purchaseOrderItems)
          .set({
            quantityReceived: newPoLineRec,
          })
          .where(eq(purchaseOrderItems.id, poLine.id));

        // Update in-memory map for PO status calculation
        poLine.quantityReceived = newPoLineRec;
      }

      // 6. Check overall PO fulfillment status
      let allFulfilled = true;
      for (const line of poItems) {
        if (Number(line.quantityReceived) < Number(line.quantityOrdered)) {
          allFulfilled = false;
          break;
        }
      }

      const nextStatus = allFulfilled ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
      await tx
        .update(purchaseOrders)
        .set({
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, po.id));

      // 7. Append audit log
      await createAuditLog(
        {
          actorId: actor.id,
          action: 'GOODS_RECEIPT_CREATE',
          entityType: 'PURCHASE_ORDER',
          entityId: po.id,
          newValues: {
            receiptId: receipt.id,
            receiptNumber: receipt.receiptNumber,
            poNumber: po.poNumber,
            warehouseId: po.destinationWarehouseId,
            itemCount: input.items.length,
            newPOStatus: nextStatus,
          },
        },
        tx
      );

      return receipt;
    })
    .then(async (rc) => {
      return (await getGoodsReceiptById(rc.id))!;
    });
}

/**
 * Retrieve a single Goods Receipt by ID with line items.
 */
export async function getGoodsReceiptById(id: string): Promise<GoodsReceiptDetailItem | null> {
  await requirePermission(PERMISSIONS.PURCHASING_READ);

  const [receipt] = await db
    .select({
      id: goodsReceipts.id,
      receiptNumber: goodsReceipts.receiptNumber,
      purchaseOrderId: goodsReceipts.purchaseOrderId,
      poNumber: purchaseOrders.poNumber,
      supplierName: suppliers.name,
      warehouseId: goodsReceipts.warehouseId,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      receivedByName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      notes: goodsReceipts.notes,
      receivedAt: goodsReceipts.receivedAt,
    })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(goodsReceipts.purchaseOrderId, purchaseOrders.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(goodsReceipts.warehouseId, warehouses.id))
    .leftJoin(users, eq(goodsReceipts.receivedBy, users.id))
    .where(eq(goodsReceipts.id, id))
    .limit(1);

  if (!receipt) return null;

  const items = await db
    .select({
      id: goodsReceiptItems.id,
      productId: goodsReceiptItems.productId,
      productName: products.name,
      sku: products.sku,
      uom: products.uom,
      quantityReceived: goodsReceiptItems.quantityReceived,
      unitCost: goodsReceiptItems.unitCost,
    })
    .from(goodsReceiptItems)
    .leftJoin(products, eq(goodsReceiptItems.productId, products.id))
    .where(eq(goodsReceiptItems.goodsReceiptId, id));

  let totalQty = 0;
  const formattedItems = items.map((i) => {
    const qty = Number(i.quantityReceived);
    totalQty += qty;
    return {
      id: i.id,
      productId: i.productId,
      productName: i.productName || 'Unknown Product',
      sku: i.sku || 'UNK',
      uom: i.uom || 'EACH',
      quantityReceived: qty.toFixed(2),
      unitCost: Number(i.unitCost).toFixed(4),
    };
  });

  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    purchaseOrderId: receipt.purchaseOrderId,
    poNumber: receipt.poNumber || 'Unknown PO',
    supplierName: receipt.supplierName || 'Unknown Supplier',
    warehouseId: receipt.warehouseId,
    warehouseName: receipt.warehouseName || 'Unknown Warehouse',
    warehouseCode: receipt.warehouseCode || 'UNK',
    receivedByName: receipt.receivedByName || null,
    notes: receipt.notes || null,
    receivedAt: receipt.receivedAt,
    itemCount: formattedItems.length,
    totalQuantityReceived: totalQty.toFixed(2),
    items: formattedItems,
  };
}

/**
 * Query Goods Receipts list with pagination and filters.
 */
export async function getGoodsReceipts(
  filters: Partial<QueryGoodsReceiptsInput> = {}
): Promise<PaginatedGoodsReceipts> {
  await requirePermission(PERMISSIONS.PURCHASING_READ);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.purchaseOrderId) {
    conditions.push(eq(goodsReceipts.purchaseOrderId, filters.purchaseOrderId));
  }
  if (filters.warehouseId) {
    conditions.push(eq(goodsReceipts.warehouseId, filters.warehouseId));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(goodsReceipts.receiptNumber, term),
        ilike(purchaseOrders.poNumber, term),
        ilike(suppliers.name, term),
        ilike(warehouses.name, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${goodsReceipts.id})::int` })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(goodsReceipts.purchaseOrderId, purchaseOrders.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(goodsReceipts.warehouseId, warehouses.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: goodsReceipts.id,
      receiptNumber: goodsReceipts.receiptNumber,
      purchaseOrderId: goodsReceipts.purchaseOrderId,
      poNumber: purchaseOrders.poNumber,
      supplierName: suppliers.name,
      warehouseId: goodsReceipts.warehouseId,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      receivedByName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      notes: goodsReceipts.notes,
      receivedAt: goodsReceipts.receivedAt,
      itemCount: sql<number>`count(${goodsReceiptItems.id})::int`,
      totalQuantityReceived: sql<string>`coalesce(sum(${goodsReceiptItems.quantityReceived}), 0)::text`,
    })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(goodsReceipts.purchaseOrderId, purchaseOrders.id))
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .leftJoin(warehouses, eq(goodsReceipts.warehouseId, warehouses.id))
    .leftJoin(users, eq(goodsReceipts.receivedBy, users.id))
    .leftJoin(goodsReceiptItems, eq(goodsReceipts.id, goodsReceiptItems.goodsReceiptId))
    .where(whereClause)
    .groupBy(
      goodsReceipts.id,
      goodsReceipts.receiptNumber,
      goodsReceipts.purchaseOrderId,
      purchaseOrders.poNumber,
      suppliers.name,
      goodsReceipts.warehouseId,
      warehouses.name,
      warehouses.code,
      users.firstName,
      users.lastName,
      goodsReceipts.notes,
      goodsReceipts.receivedAt
    )
    .orderBy(desc(goodsReceipts.receivedAt))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      purchaseOrderId: r.purchaseOrderId,
      poNumber: r.poNumber || 'Unknown PO',
      supplierName: r.supplierName || 'Unknown Supplier',
      warehouseId: r.warehouseId,
      warehouseName: r.warehouseName || 'Unknown Warehouse',
      warehouseCode: r.warehouseCode || 'UNK',
      receivedByName: r.receivedByName || null,
      notes: r.notes || null,
      receivedAt: r.receivedAt,
      itemCount: r.itemCount,
      totalQuantityReceived: Number(r.totalQuantityReceived).toFixed(2),
    })),
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit) || 1,
  };
}
