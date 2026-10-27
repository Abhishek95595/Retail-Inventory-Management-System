import { db } from '@/backend/db';
import { inventoryBalances, inventoryMovements, warehouses, products, users } from '@/backend/db/schema';
import { eq, and, or, ilike, desc, SQL, sql, gte, lte } from 'drizzle-orm';
import { requirePermission } from '@/backend/server/auth';
import { PERMISSIONS } from '@/shared/permissions';
import { createAuditLog } from '@/backend/server/audit';
import {
  StockReceiptInput,
  StockIssueInput,
  StockAdjustmentInput,
  QueryMovementsInput,
} from '@/shared/validations/movement';

export type MovementHistoryFilters = Partial<QueryMovementsInput>;

export interface MovementHistoryItem {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  productId: string;
  sku: string;
  productName: string;
  uom: string;
  movementType:
    | 'RECEIPT'
    | 'DISPATCH'
    | 'ADJUSTMENT_IN'
    | 'ADJUSTMENT_OUT'
    | 'TRANSFER_OUT'
    | 'TRANSFER_IN'
    | 'QUARANTINE_HOLD'
    | 'QUARANTINE_RELEASE';
  quantity: string;
  balanceBefore: string;
  balanceAfter: string;
  referenceType: string;
  referenceId: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  reason: string;
  createdAt: Date;
}

export interface PaginatedMovements {
  items: MovementHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

/**
 * Process a Stock Receipt (RECEIPT).
 * Atomically increases on_hand_qty, creates balance if absent, and appends movement ledger row.
 */
export async function recordStockReceipt(input: StockReceiptInput) {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_RECEIVE);

  const qty = Number(input.quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Receipt quantity must be strictly greater than zero.');
  }

  // Idempotency check: if referenceId provided with idempotency tag, check existing movement
  const refType = input.referenceType || 'MANUAL_RECEIPT';
  const refId = input.idempotencyKey || input.referenceId || `REC-${Date.now()}`;

  if (input.idempotencyKey) {
    const [existingMovement] = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceId, input.idempotencyKey),
          eq(inventoryMovements.movementType, 'RECEIPT')
        )
      )
      .limit(1);

    if (existingMovement) {
      // Idempotent return: verify payload matches
      if (
        existingMovement.warehouseId !== input.warehouseId ||
        existingMovement.productId !== input.productId
      ) {
        throw new Error(
          'Idempotency key conflict: reused key with different warehouse or product payload.'
        );
      }
      return existingMovement;
    }
  }

  // Execute in serializable/locked transaction
  return await db.transaction(async (tx) => {
    // 1. Verify warehouse exists and is active
    const [wh] = await tx
      .select({ id: warehouses.id, name: warehouses.name, isActive: warehouses.isActive })
      .from(warehouses)
      .where(eq(warehouses.id, input.warehouseId))
      .limit(1);

    if (!wh) {
      throw new Error('Warehouse facility not found.');
    }
    if (!wh.isActive) {
      throw new Error(
        `Warehouse ${wh.name} is deactivated. Incoming stock receipts cannot be accepted at inactive facilities.`
      );
    }

    // 2. Verify product exists and is not archived
    const [prod] = await tx
      .select({ id: products.id, name: products.name, isArchived: products.isArchived })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!prod) {
      throw new Error('Product not found in catalog.');
    }
    if (prod.isArchived) {
      throw new Error(
        `Product ${prod.name} is archived. Archived items cannot be received into active inventory.`
      );
    }

    // 3. Acquire row lock on inventory_balances or initialize zero balance
    // Attempt to lock row using raw query FOR UPDATE
    const lockedRows = await tx.execute<{
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
          WHERE warehouse_id = ${input.warehouseId} AND product_id = ${input.productId}
          FOR UPDATE`
    );

    let balanceRow = lockedRows[0];

    if (!balanceRow) {
      // Safely insert with ON CONFLICT DO NOTHING to prevent race condition
      await tx.execute(
        sql`INSERT INTO inventory_balances (warehouse_id, product_id, on_hand_qty, reserved_qty, quarantined_qty)
            VALUES (${input.warehouseId}, ${input.productId}, 0.00, 0.00, 0.00)
            ON CONFLICT (warehouse_id, product_id) DO NOTHING`
      );

      // Re-query with lock
      const refetched = await tx.execute<{
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
            WHERE warehouse_id = ${input.warehouseId} AND product_id = ${input.productId}
            FOR UPDATE`
      );
      balanceRow = refetched[0];
    }

    const balanceBefore = balanceRow.on_hand_qty;
    const balanceAfter = addDecimals(balanceBefore, qty);

    // 4. Update balance
    await tx
      .update(inventoryBalances)
      .set({
        onHandQty: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(inventoryBalances.id, balanceRow.id));

    // 5. Append immutable movement ledger row
    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        warehouseId: input.warehouseId,
        productId: input.productId,
        movementType: 'RECEIPT',
        quantity: qty.toFixed(2),
        balanceBefore,
        balanceAfter,
        referenceType: refType,
        referenceId: refId,
        actorId: actor.id,
        reason: input.reason.trim(),
      })
      .returning();

    // 6. Record audit log
    await createAuditLog(
      {
        actorId: actor.id,
        action: 'RECEIVE',
        entityType: 'MOVEMENT',
        entityId: movement.id,
        newValues: movement,
      },
      tx
    );

    return movement;
  });
}

/**
 * Process a Stock Issue (DISPATCH for internal consumption, damage write-off, samples).
 * Atomically decreases on_hand_qty, strictly validating sufficient available_qty under row lock.
 */
export async function recordStockIssue(input: StockIssueInput) {
  const actor = await requirePermission(PERMISSIONS.PURCHASING_RECEIVE);

  const qty = Number(input.quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Issue quantity must be strictly greater than zero.');
  }

  const refType = input.referenceType || 'MANUAL_ISSUE';
  const refId = input.idempotencyKey || input.referenceId || `ISS-${Date.now()}`;

  if (input.idempotencyKey) {
    const [existingMovement] = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceId, input.idempotencyKey),
          eq(inventoryMovements.movementType, 'DISPATCH')
        )
      )
      .limit(1);

    if (existingMovement) {
      if (
        existingMovement.warehouseId !== input.warehouseId ||
        existingMovement.productId !== input.productId
      ) {
        throw new Error(
          'Idempotency key conflict: reused key with different warehouse or product payload.'
        );
      }
      return existingMovement;
    }
  }

  return await db.transaction(async (tx) => {
    // 1. Lock inventory balance row
    const lockedRows = await tx.execute<{
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
          WHERE warehouse_id = ${input.warehouseId} AND product_id = ${input.productId}
          FOR UPDATE`
    );

    const balanceRow = lockedRows[0];
    if (!balanceRow) {
      throw new Error(
        'Insufficient stock: No inventory balance record exists for this product and facility.'
      );
    }

    const currentOnHand = Number(balanceRow.on_hand_qty);
    const currentAvailable = Number(balanceRow.available_qty);
    const reservedQty = Number(balanceRow.reserved_qty);
    const quarantinedQty = Number(balanceRow.quarantined_qty);

    // 2. Validate availability invariant: issue cannot exceed available quantity
    if (qty > currentAvailable) {
      throw new Error(
        `Insufficient available stock. Requested: ${qty.toFixed(2)}, Available: ${currentAvailable.toFixed(2)} (On-Hand: ${currentOnHand.toFixed(2)}, Reserved: ${reservedQty.toFixed(2)}, Quarantined: ${quarantinedQty.toFixed(2)}).`
      );
    }

    const balanceBefore = balanceRow.on_hand_qty;
    const balanceAfter = subtractDecimals(balanceBefore, qty);

    if (Number(balanceAfter) < 0) {
      throw new Error('Stock invariant violated: on_hand_qty cannot become negative.');
    }

    // 3. Update balance
    await tx
      .update(inventoryBalances)
      .set({
        onHandQty: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(inventoryBalances.id, balanceRow.id));

    // 4. Append immutable movement ledger entry
    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        warehouseId: input.warehouseId,
        productId: input.productId,
        movementType: 'DISPATCH',
        quantity: qty.toFixed(2),
        balanceBefore,
        balanceAfter,
        referenceType: refType,
        referenceId: refId,
        actorId: actor.id,
        reason: input.reason.trim(),
      })
      .returning();

    // 5. Audit log
    await createAuditLog(
      {
        actorId: actor.id,
        action: 'DISPATCH',
        entityType: 'MOVEMENT',
        entityId: movement.id,
        newValues: movement,
      },
      tx
    );

    return movement;
  });
}

/**
 * Process a Stock Adjustment (ADJUSTMENT_IN or ADJUSTMENT_OUT).
 * Corrects physical stock discrepancies with mandatory reason and strict invariant checks.
 */
export async function recordStockAdjustment(input: StockAdjustmentInput) {
  const actor = await requirePermission(PERMISSIONS.INVENTORY_ADJUST_CREATE);

  const qty = Number(input.quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Adjustment quantity must be strictly greater than zero.');
  }

  const direction = input.direction; // 'IN' or 'OUT'
  const movementType = direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
  const refType = input.referenceType || 'CYCLE_COUNT';
  const refId = input.idempotencyKey || input.referenceId || `ADJ-${Date.now()}`;

  if (input.idempotencyKey) {
    const [existingMovement] = await db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceId, input.idempotencyKey),
          eq(inventoryMovements.movementType, movementType)
        )
      )
      .limit(1);

    if (existingMovement) {
      if (
        existingMovement.warehouseId !== input.warehouseId ||
        existingMovement.productId !== input.productId
      ) {
        throw new Error(
          'Idempotency key conflict: reused key with different warehouse or product payload.'
        );
      }
      return existingMovement;
    }
  }

  return await db.transaction(async (tx) => {
    // 1. Lock balance row
    const lockedRows = await tx.execute<{
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
          WHERE warehouse_id = ${input.warehouseId} AND product_id = ${input.productId}
          FOR UPDATE`
    );

    let balanceRow = lockedRows[0];

    if (!balanceRow) {
      if (direction === 'OUT') {
        throw new Error(
          'Cannot adjust stock downward: no existing inventory balance record exists.'
        );
      }

      // If adjusting IN and row does not exist, create zero balance safely
      await tx.execute(
        sql`INSERT INTO inventory_balances (warehouse_id, product_id, on_hand_qty, reserved_qty, quarantined_qty)
            VALUES (${input.warehouseId}, ${input.productId}, 0.00, 0.00, 0.00)
            ON CONFLICT (warehouse_id, product_id) DO NOTHING`
      );

      const refetched = await tx.execute<{
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
            WHERE warehouse_id = ${input.warehouseId} AND product_id = ${input.productId}
            FOR UPDATE`
      );
      balanceRow = refetched[0];
    }

    const currentOnHand = Number(balanceRow.on_hand_qty);
    const currentAvailable = Number(balanceRow.available_qty);

    let balanceAfter: string;

    if (direction === 'IN') {
      balanceAfter = addDecimals(balanceRow.on_hand_qty, qty);
    } else {
      // Downward adjustment: ensure we do not consume reserved or quarantined stock
      if (qty > currentAvailable) {
        throw new Error(
          `Cannot adjust stock downward by ${qty.toFixed(2)} units. Only ${currentAvailable.toFixed(2)} units are available (Current on-hand: ${currentOnHand.toFixed(2)}, Reserved: ${balanceRow.reserved_qty}, Quarantined: ${balanceRow.quarantined_qty}).`
        );
      }
      balanceAfter = subtractDecimals(balanceRow.on_hand_qty, qty);
      if (Number(balanceAfter) < 0) {
        throw new Error('Stock adjustment cannot result in negative on-hand quantity.');
      }
    }

    // 2. Update balance
    await tx
      .update(inventoryBalances)
      .set({
        onHandQty: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(inventoryBalances.id, balanceRow.id));

    // 3. Append immutable movement record
    const [movement] = await tx
      .insert(inventoryMovements)
      .values({
        warehouseId: input.warehouseId,
        productId: input.productId,
        movementType,
        quantity: qty.toFixed(2),
        balanceBefore: balanceRow.on_hand_qty,
        balanceAfter,
        referenceType: refType,
        referenceId: refId,
        actorId: actor.id,
        reason: input.reason.trim(),
      })
      .returning();

    // 4. Audit log
    await createAuditLog(
      {
        actorId: actor.id,
        action: 'ADJUST',
        entityType: 'MOVEMENT',
        entityId: movement.id,
        newValues: movement,
      },
      tx
    );

    return movement;
  });
}

/**
 * Query inventory movement history with filtering, search, and pagination.
 */
export async function getMovementHistory(
  filters: MovementHistoryFilters = {}
): Promise<PaginatedMovements> {
  await requirePermission(PERMISSIONS.INVENTORY_READ);

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 15));
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.warehouseId) {
    conditions.push(eq(inventoryMovements.warehouseId, filters.warehouseId));
  }

  if (filters.productId) {
    conditions.push(eq(inventoryMovements.productId, filters.productId));
  }

  if (filters.movementType) {
    conditions.push(eq(inventoryMovements.movementType, filters.movementType));
  }

  if (filters.actorId) {
    conditions.push(eq(inventoryMovements.actorId, filters.actorId));
  }

  if (filters.referenceType) {
    conditions.push(eq(inventoryMovements.referenceType, filters.referenceType));
  }

  if (filters.startDate) {
    conditions.push(gte(inventoryMovements.createdAt, new Date(filters.startDate)));
  }

  if (filters.endDate) {
    conditions.push(lte(inventoryMovements.createdAt, new Date(filters.endDate)));
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.sku, term),
        ilike(inventoryMovements.referenceId, term),
        ilike(inventoryMovements.reason, term),
        ilike(warehouses.name, term),
        ilike(warehouses.code, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryMovements)
    .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .leftJoin(users, eq(inventoryMovements.actorId, users.id))
    .where(whereClause);

  // Items
  const items = await db
    .select({
      id: inventoryMovements.id,
      warehouseId: warehouses.id,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      productId: products.id,
      sku: products.sku,
      productName: products.name,
      uom: products.uom,
      movementType: inventoryMovements.movementType,
      quantity: inventoryMovements.quantity,
      balanceBefore: inventoryMovements.balanceBefore,
      balanceAfter: inventoryMovements.balanceAfter,
      referenceType: inventoryMovements.referenceType,
      referenceId: inventoryMovements.referenceId,
      actorId: inventoryMovements.actorId,
      actorName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      actorEmail: users.email,
      reason: inventoryMovements.reason,
      createdAt: inventoryMovements.createdAt,
    })
    .from(inventoryMovements)
    .innerJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .innerJoin(products, eq(inventoryMovements.productId, products.id))
    .leftJoin(users, eq(inventoryMovements.actorId, users.id))
    .where(whereClause)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit) || 1,
  };
}
