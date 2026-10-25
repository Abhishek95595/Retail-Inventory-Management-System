import { db } from '@/db';
import {
  stockTransfers,
  stockTransferItems,
  inventoryBalances,
  inventoryMovements,
  warehouses,
  products,
} from '@/db/schema';
import { eq, and, or, ilike, desc, SQL, sql } from 'drizzle-orm';
import { requirePermission } from '@/server/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { createAuditLog } from '@/server/audit';
import {
  CreateTransferInput,
  UpdateDraftTransferInput,
  DispatchTransferInput,
  ReceiveTransferInput,
  CancelTransferInput,
  QueryTransfersInput,
} from '@/lib/validations/transfer';

/**
 * Decimal addition ensuring 2 decimal places precision.
 */
function addDecimals(a: string | number, b: string | number): string {
  const sum = (Math.round(Number(a) * 100) + Math.round(Number(b) * 100)) / 100;
  return sum.toFixed(2);
}

/**
 * Decimal subtraction ensuring 2 decimal places precision.
 */
function subtractDecimals(a: string | number, b: string | number): string {
  const diff = (Math.round(Number(a) * 100) - Math.round(Number(b) * 100)) / 100;
  return diff.toFixed(2);
}

export interface TransferListItem {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  sourceWarehouseCode: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  destinationWarehouseCode: string;
  status: 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  itemCount: number;
  totalQuantity: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferDetailItem extends TransferListItem {
  dispatchedByName: string | null;
  receivedByName: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    quantity: string;
  }>;
}

export interface PaginatedTransfers {
  items: TransferListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query stock transfers with pagination, status and warehouse filters, and search.
 */
export async function getTransfers(
  filters: Partial<QueryTransfersInput> = {}
): Promise<PaginatedTransfers> {
  await requirePermission(PERMISSIONS.INVENTORY_READ);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(stockTransfers.status, filters.status));
  }
  if (filters.sourceWarehouseId) {
    conditions.push(eq(stockTransfers.sourceWarehouseId, filters.sourceWarehouseId));
  }
  if (filters.destinationWarehouseId) {
    conditions.push(eq(stockTransfers.destinationWarehouseId, filters.destinationWarehouseId));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(stockTransfers.transferNumber, term), ilike(stockTransfers.notes, term))!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count total records matching filters
  const countResult = await db
    .select({ count: sql<string>`count(*)` })
    .from(stockTransfers)
    .where(whereClause);
  const total = parseInt(countResult[0]?.count || '0', 10);

  // Join source warehouse, destination warehouse, and aggregated item summary
  const rows = await db
    .select({
      id: stockTransfers.id,
      transferNumber: stockTransfers.transferNumber,
      sourceWarehouseId: stockTransfers.sourceWarehouseId,
      sourceWarehouseName: sql<string>`src_wh.name`,
      sourceWarehouseCode: sql<string>`src_wh.code`,
      destinationWarehouseId: stockTransfers.destinationWarehouseId,
      destinationWarehouseName: sql<string>`dest_wh.name`,
      destinationWarehouseCode: sql<string>`dest_wh.code`,
      status: stockTransfers.status,
      dispatchedAt: stockTransfers.dispatchedAt,
      receivedAt: stockTransfers.receivedAt,
      notes: stockTransfers.notes,
      createdAt: stockTransfers.createdAt,
      updatedAt: stockTransfers.updatedAt,
      itemCount: sql<number>`count(distinct ${stockTransferItems.id})::int`,
      totalQuantity: sql<string>`coalesce(sum(${stockTransferItems.quantity}), 0)::text`,
    })
    .from(stockTransfers)
    .innerJoin(sql`warehouses AS src_wh`, sql`src_wh.id = ${stockTransfers.sourceWarehouseId}`)
    .innerJoin(
      sql`warehouses AS dest_wh`,
      sql`dest_wh.id = ${stockTransfers.destinationWarehouseId}`
    )
    .leftJoin(stockTransferItems, eq(stockTransferItems.stockTransferId, stockTransfers.id))
    .where(whereClause)
    .groupBy(
      stockTransfers.id,
      sql`src_wh.name`,
      sql`src_wh.code`,
      sql`dest_wh.name`,
      sql`dest_wh.code`
    )
    .orderBy(desc(stockTransfers.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieve comprehensive details for a specific transfer including line items.
 */
export async function getTransferById(id: string): Promise<TransferDetailItem | null> {
  await requirePermission(PERMISSIONS.INVENTORY_READ);

  const [transfer] = await db
    .select({
      id: stockTransfers.id,
      transferNumber: stockTransfers.transferNumber,
      sourceWarehouseId: stockTransfers.sourceWarehouseId,
      sourceWarehouseName: sql<string>`src_wh.name`,
      sourceWarehouseCode: sql<string>`src_wh.code`,
      destinationWarehouseId: stockTransfers.destinationWarehouseId,
      destinationWarehouseName: sql<string>`dest_wh.name`,
      destinationWarehouseCode: sql<string>`dest_wh.code`,
      status: stockTransfers.status,
      dispatchedAt: stockTransfers.dispatchedAt,
      receivedAt: stockTransfers.receivedAt,
      notes: stockTransfers.notes,
      createdAt: stockTransfers.createdAt,
      updatedAt: stockTransfers.updatedAt,
      dispatchedByName: sql<string | null>`concat(disp_u.first_name, ' ', disp_u.last_name)`,
      receivedByName: sql<string | null>`concat(recv_u.first_name, ' ', recv_u.last_name)`,
    })
    .from(stockTransfers)
    .innerJoin(sql`warehouses AS src_wh`, sql`src_wh.id = ${stockTransfers.sourceWarehouseId}`)
    .innerJoin(
      sql`warehouses AS dest_wh`,
      sql`dest_wh.id = ${stockTransfers.destinationWarehouseId}`
    )
    .leftJoin(sql`users AS disp_u`, sql`disp_u.id = ${stockTransfers.dispatchedBy}`)
    .leftJoin(sql`users AS recv_u`, sql`recv_u.id = ${stockTransfers.receivedBy}`)
    .where(eq(stockTransfers.id, id))
    .limit(1);

  if (!transfer) return null;

  const items = await db
    .select({
      id: stockTransferItems.id,
      productId: stockTransferItems.productId,
      productName: products.name,
      sku: products.sku,
      uom: products.uom,
      quantity: stockTransferItems.quantity,
    })
    .from(stockTransferItems)
    .innerJoin(products, eq(products.id, stockTransferItems.productId))
    .where(eq(stockTransferItems.stockTransferId, id))
    .orderBy(products.sku);

  const totalQuantity = items.reduce((acc, it) => acc + Number(it.quantity), 0).toFixed(2);

  return {
    ...transfer,
    itemCount: items.length,
    totalQuantity,
    items,
  };
}

/**
 * Create a new transfer in DRAFT status.
 */
export async function createTransfer(input: CreateTransferInput) {
  const actor = await requirePermission(PERMISSIONS.INVENTORY_TRANSFER_MANAGE);

  if (input.sourceWarehouseId === input.destinationWarehouseId) {
    throw new Error('Source and destination warehouses must be different facilities.');
  }

  // 1. Verify both warehouses exist and are active
  const [srcWh] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, input.sourceWarehouseId))
    .limit(1);
  if (!srcWh) throw new Error('Source warehouse not found.');
  if (!srcWh.isActive) throw new Error(`Source warehouse '${srcWh.name}' is inactive.`);

  const [destWh] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, input.destinationWarehouseId))
    .limit(1);
  if (!destWh) throw new Error('Destination warehouse not found.');
  if (!destWh.isActive) throw new Error(`Destination warehouse '${destWh.name}' is inactive.`);

  // 2. Validate all products exist and are active
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one product line item is required.');
  }

  for (const item of input.items) {
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid transfer quantity for product ${item.productId}.`);
    }

    const [prod] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!prod) throw new Error(`Product ${item.productId} not found.`);
    if (prod.isArchived) {
      throw new Error(`Product '${prod.name}' is archived and cannot be transferred.`);
    }
  }

  // 3. Generate unique human-readable transfer number: TRF-YYYYMMDD-XXXX
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const transferNumber = `TRF-${today}-${randSuffix}`;

  return await db.transaction(async (tx) => {
    const [transfer] = await tx
      .insert(stockTransfers)
      .values({
        transferNumber,
        sourceWarehouseId: input.sourceWarehouseId,
        destinationWarehouseId: input.destinationWarehouseId,
        status: 'DRAFT',
        notes: input.notes || null,
      })
      .returning();

    for (const item of input.items) {
      await tx.insert(stockTransferItems).values({
        stockTransferId: transfer.id,
        productId: item.productId,
        quantity: Number(item.quantity).toFixed(2),
      });
    }

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CREATE',
        entityType: 'TRANSFER',
        entityId: transfer.id,
        newValues: {
          transferNumber,
          sourceWarehouseId: input.sourceWarehouseId,
          destinationWarehouseId: input.destinationWarehouseId,
          itemCount: input.items.length,
          notes: input.notes || null,
        },
      },
      tx
    );

    return transfer;
  });
}

/**
 * Update an existing DRAFT transfer (permitted only while in DRAFT status).
 */
export async function updateDraftTransfer(id: string, input: UpdateDraftTransferInput) {
  const actor = await requirePermission(PERMISSIONS.INVENTORY_TRANSFER_MANAGE);

  return await db.transaction(async (tx) => {
    // Acquire lock on transfer
    const lockedRows = await tx.execute<{
      id: string;
      transfer_number: string;
      source_warehouse_id: string;
      destination_warehouse_id: string;
      status: string;
      notes: string | null;
    }>(
      sql`SELECT id, transfer_number, source_warehouse_id, destination_warehouse_id, status, notes
          FROM stock_transfers
          WHERE id = ${id}
          FOR UPDATE`
    );

    const transfer = lockedRows[0];
    if (!transfer) throw new Error('Transfer not found.');
    if (transfer.status !== 'DRAFT') {
      throw new Error(
        `Cannot modify transfer in '${transfer.status}' status. Only DRAFT transfers can be edited.`
      );
    }

    const newDestId = input.destinationWarehouseId || transfer.destination_warehouse_id;
    if (newDestId === transfer.source_warehouse_id) {
      throw new Error('Destination warehouse cannot be identical to source warehouse.');
    }

    if (input.destinationWarehouseId) {
      const [destWh] = await tx
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, newDestId))
        .limit(1);
      if (!destWh || !destWh.isActive) {
        throw new Error('Destination warehouse is invalid or inactive.');
      }
    }

    // Update parent transfer fields
    await tx
      .update(stockTransfers)
      .set({
        destinationWarehouseId: newDestId,
        notes: input.notes !== undefined ? input.notes : transfer.notes,
        updatedAt: new Date(),
      })
      .where(eq(stockTransfers.id, id));

    // If items provided, replace line items
    if (input.items && input.items.length > 0) {
      await tx.delete(stockTransferItems).where(eq(stockTransferItems.stockTransferId, id));

      for (const item of input.items) {
        const [prod] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);
        if (!prod || prod.isArchived) {
          throw new Error(`Product ${item.productId} not found or archived.`);
        }

        await tx.insert(stockTransferItems).values({
          stockTransferId: id,
          productId: item.productId,
          quantity: Number(item.quantity).toFixed(2),
        });
      }
    }

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'UPDATE',
        entityType: 'TRANSFER',
        entityId: id,
        newValues: {
          destinationWarehouseId: newDestId,
          notes: input.notes,
          itemCount: input.items?.length,
        },
      },
      tx
    );

    return { id, status: 'DRAFT' };
  });
}

/**
 * Dispatch a DRAFT transfer:
 * Atomically decrements source warehouse on_hand_qty for every item line under row-level lock,
 * strictly verifying available_qty >= quantity,
 * appends TRANSFER_OUT movement ledger rows, and transitions status to DISPATCHED.
 */
export async function dispatchTransfer(id: string, input: DispatchTransferInput = {}) {
  const actor = await requirePermission(PERMISSIONS.INVENTORY_TRANSFER_DISPATCH);

  return await db.transaction(async (tx) => {
    // 1. Lock transfer row
    const lockedTransfers = await tx.execute<{
      id: string;
      transfer_number: string;
      source_warehouse_id: string;
      destination_warehouse_id: string;
      status: string;
    }>(
      sql`SELECT id, transfer_number, source_warehouse_id, destination_warehouse_id, status
          FROM stock_transfers
          WHERE id = ${id}
          FOR UPDATE`
    );

    const transfer = lockedTransfers[0];
    if (!transfer) throw new Error('Transfer not found.');

    // Idempotency check: if already dispatched
    if (transfer.status === 'DISPATCHED') {
      if (input.idempotencyKey) {
        return { id: transfer.id, status: 'DISPATCHED', alreadyProcessed: true };
      }
      throw new Error(`Transfer ${transfer.transfer_number} has already been dispatched.`);
    }

    if (transfer.status !== 'DRAFT') {
      throw new Error(
        `Invalid status transition: Cannot dispatch transfer in '${transfer.status}' status. Only DRAFT transfers can be dispatched.`
      );
    }

    // 2. Fetch transfer items
    const items = await tx
      .select()
      .from(stockTransferItems)
      .where(eq(stockTransferItems.stockTransferId, id))
      .orderBy(stockTransferItems.productId); // Canonical order to prevent deadlocks

    if (items.length === 0) {
      throw new Error('Transfer has no line items to dispatch.');
    }

    // 3. Process each line under source balance lock
    for (const item of items) {
      const qty = Number(item.quantity);

      // Lock source inventory balance row
      const lockedBalances = await tx.execute<{
        id: string;
        warehouse_id: string;
        product_id: string;
        on_hand_qty: string;
        reserved_qty: string;
        quarantined_qty: string;
        available_qty: string;
      }>(
        sql`SELECT id, warehouse_id, product_id, on_hand_qty, reserved_qty, quarantined_qty, available_qty
            FROM inventory_balances
            WHERE warehouse_id = ${transfer.source_warehouse_id} AND product_id = ${item.productId}
            FOR UPDATE`
      );

      const sourceBal = lockedBalances[0];
      if (!sourceBal) {
        throw new Error(
          `Insufficient stock at source warehouse: No inventory balance exists for product ${item.productId}.`
        );
      }

      const availableQty = Number(sourceBal.available_qty);
      if (qty > availableQty) {
        throw new Error(
          `Insufficient available stock for product ${item.productId} at source warehouse. Requested: ${qty.toFixed(2)}, Available: ${availableQty.toFixed(2)}.`
        );
      }

      const balanceBefore = sourceBal.on_hand_qty;
      const balanceAfter = subtractDecimals(balanceBefore, qty);

      if (Number(balanceAfter) < 0) {
        throw new Error('Stock invariant violated: on_hand_qty cannot become negative.');
      }

      // Decrement source balance on_hand_qty
      await tx
        .update(inventoryBalances)
        .set({
          onHandQty: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(inventoryBalances.id, sourceBal.id));

      // Append immutable TRANSFER_OUT movement ledger entry
      await tx.insert(inventoryMovements).values({
        warehouseId: transfer.source_warehouse_id,
        productId: item.productId,
        movementType: 'TRANSFER_OUT',
        quantity: qty.toFixed(2),
        balanceBefore,
        balanceAfter,
        referenceType: 'TRANSFER',
        referenceId: transfer.transfer_number,
        actorId: actor.id,
        reason: `Transfer dispatch to destination warehouse for transfer ${transfer.transfer_number}`,
      });
    }

    // 4. Update transfer status to DISPATCHED
    const now = new Date();
    await tx
      .update(stockTransfers)
      .set({
        status: 'DISPATCHED',
        dispatchedBy: actor.id,
        dispatchedAt: now,
        updatedAt: now,
      })
      .where(eq(stockTransfers.id, id));

    // 5. Create audit log
    await createAuditLog(
      {
        actorId: actor.id,
        action: 'DISPATCH',
        entityType: 'TRANSFER',
        entityId: id,
        newValues: {
          status: 'DISPATCHED',
          dispatchedAt: now,
          itemCount: items.length,
          transferNumber: transfer.transfer_number,
        },
      },
      tx
    );

    return { id: transfer.id, status: 'DISPATCHED', dispatchedAt: now };
  });
}

/**
 * Receive a DISPATCHED transfer:
 * Atomically increments destination warehouse on_hand_qty for every item line under row-level lock
 * (initializing zero balance row if none exists),
 * appends TRANSFER_IN movement ledger rows, and transitions status to RECEIVED.
 */
export async function receiveTransfer(id: string, input: ReceiveTransferInput = {}) {
  const actor = await requirePermission(PERMISSIONS.INVENTORY_TRANSFER_RECEIVE);

  return await db.transaction(async (tx) => {
    // 1. Lock transfer row
    const lockedTransfers = await tx.execute<{
      id: string;
      transfer_number: string;
      source_warehouse_id: string;
      destination_warehouse_id: string;
      status: string;
    }>(
      sql`SELECT id, transfer_number, source_warehouse_id, destination_warehouse_id, status
          FROM stock_transfers
          WHERE id = ${id}
          FOR UPDATE`
    );

    const transfer = lockedTransfers[0];
    if (!transfer) throw new Error('Transfer not found.');

    // Idempotency check: if already received
    if (transfer.status === 'RECEIVED') {
      if (input.idempotencyKey) {
        return { id: transfer.id, status: 'RECEIVED', alreadyProcessed: true };
      }
      throw new Error(`Transfer ${transfer.transfer_number} has already been received.`);
    }

    if (transfer.status !== 'DISPATCHED') {
      throw new Error(
        `Invalid status transition: Cannot receive transfer in '${transfer.status}' status. Only DISPATCHED transfers can be received.`
      );
    }

    // 2. Verify destination warehouse is still active
    const [destWh] = await tx
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, transfer.destination_warehouse_id))
      .limit(1);
    if (!destWh || !destWh.isActive) {
      throw new Error('Destination warehouse is inactive or no longer exists.');
    }

    // 3. Fetch transfer items
    const items = await tx
      .select()
      .from(stockTransferItems)
      .where(eq(stockTransferItems.stockTransferId, id))
      .orderBy(stockTransferItems.productId); // Canonical lock order

    if (items.length === 0) {
      throw new Error('Transfer has no line items to receive.');
    }

    // 4. Process each item at destination warehouse
    for (const item of items) {
      const qty = Number(item.quantity);

      // Lock or safely initialize destination inventory balance row
      let lockedBalances = await tx.execute<{
        id: string;
        warehouse_id: string;
        product_id: string;
        on_hand_qty: string;
        reserved_qty: string;
        quarantined_qty: string;
        available_qty: string;
      }>(
        sql`SELECT id, warehouse_id, product_id, on_hand_qty, reserved_qty, quarantined_qty, available_qty
            FROM inventory_balances
            WHERE warehouse_id = ${transfer.destination_warehouse_id} AND product_id = ${item.productId}
            FOR UPDATE`
      );

      let destBal = lockedBalances[0];

      if (!destBal) {
        // Safe insertion with ON CONFLICT DO NOTHING to prevent race conditions
        await tx.execute(
          sql`INSERT INTO inventory_balances (warehouse_id, product_id, on_hand_qty, reserved_qty, quarantined_qty)
              VALUES (${transfer.destination_warehouse_id}, ${item.productId}, 0.00, 0.00, 0.00)
              ON CONFLICT (warehouse_id, product_id) DO NOTHING`
        );

        // Re-lock newly created or existing row
        lockedBalances = await tx.execute<{
          id: string;
          warehouse_id: string;
          product_id: string;
          on_hand_qty: string;
          reserved_qty: string;
          quarantined_qty: string;
          available_qty: string;
        }>(
          sql`SELECT id, warehouse_id, product_id, on_hand_qty, reserved_qty, quarantined_qty, available_qty
              FROM inventory_balances
              WHERE warehouse_id = ${transfer.destination_warehouse_id} AND product_id = ${item.productId}
              FOR UPDATE`
        );

        destBal = lockedBalances[0];
      }

      if (!destBal) {
        throw new Error(
          `Failed to acquire or initialize destination balance for product ${item.productId}.`
        );
      }

      const balanceBefore = destBal.on_hand_qty;
      const balanceAfter = addDecimals(balanceBefore, qty);

      // Increment destination balance on_hand_qty
      await tx
        .update(inventoryBalances)
        .set({
          onHandQty: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(inventoryBalances.id, destBal.id));

      // Append immutable TRANSFER_IN movement ledger entry
      await tx.insert(inventoryMovements).values({
        warehouseId: transfer.destination_warehouse_id,
        productId: item.productId,
        movementType: 'TRANSFER_IN',
        quantity: qty.toFixed(2),
        balanceBefore,
        balanceAfter,
        referenceType: 'TRANSFER',
        referenceId: transfer.transfer_number,
        actorId: actor.id,
        reason: `Transfer receipt from source warehouse for transfer ${transfer.transfer_number}`,
      });
    }

    // 5. Update transfer status to RECEIVED
    const now = new Date();
    await tx
      .update(stockTransfers)
      .set({
        status: 'RECEIVED',
        receivedBy: actor.id,
        receivedAt: now,
        updatedAt: now,
      })
      .where(eq(stockTransfers.id, id));

    // 6. Record audit log
    await createAuditLog(
      {
        actorId: actor.id,
        action: 'RECEIVE',
        entityType: 'TRANSFER',
        entityId: id,
        newValues: {
          status: 'RECEIVED',
          receivedAt: now,
          itemCount: items.length,
          transferNumber: transfer.transfer_number,
        },
      },
      tx
    );

    return { id: transfer.id, status: 'RECEIVED', receivedAt: now };
  });
}

/**
 * Cancel a transfer.
 * Only DRAFT transfers may be cancelled (no stock movements occurred).
 * Once DISPATCHED, direct cancellation is rejected to prevent inventory inconsistency
 * (compensating transfers or returns must be used).
 */
export async function cancelTransfer(id: string, input: CancelTransferInput = {}) {
  const actor = await requirePermission(PERMISSIONS.INVENTORY_TRANSFER_MANAGE);

  return await db.transaction(async (tx) => {
    const lockedTransfers = await tx.execute<{
      id: string;
      transfer_number: string;
      status: string;
      notes: string | null;
    }>(
      sql`SELECT id, transfer_number, status, notes
          FROM stock_transfers
          WHERE id = ${id}
          FOR UPDATE`
    );

    const transfer = lockedTransfers[0];
    if (!transfer) throw new Error('Transfer not found.');

    if (transfer.status === 'CANCELLED') {
      return { id: transfer.id, status: 'CANCELLED', alreadyCancelled: true };
    }

    if (transfer.status !== 'DRAFT') {
      throw new Error(
        `Cannot cancel transfer in '${transfer.status}' status. Only DRAFT transfers can be cancelled without inventory movements. For dispatched transfers, complete receipt and execute a return transfer.`
      );
    }

    const cancelNotes = input.reason
      ? `${transfer.notes || ''} [Cancelled: ${input.reason}]`.trim()
      : transfer.notes;

    const now = new Date();
    await tx
      .update(stockTransfers)
      .set({
        status: 'CANCELLED',
        notes: cancelNotes,
        updatedAt: now,
      })
      .where(eq(stockTransfers.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CANCEL',
        entityType: 'TRANSFER',
        entityId: id,
        newValues: {
          status: 'CANCELLED',
          transferNumber: transfer.transfer_number,
          reason: input.reason || null,
        },
      },
      tx
    );

    return { id: transfer.id, status: 'CANCELLED' };
  });
}
