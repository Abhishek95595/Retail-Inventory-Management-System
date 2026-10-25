import { db } from '@/db';
import {
  salesOrders,
  salesOrderItems,
  stockReservations,
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
  CreateSalesOrderInput,
  UpdateDraftOrderInput,
  ConfirmOrderInput,
  DispatchOrderInput,
  CancelOrderInput,
  QueryOrdersInput,
} from '@/lib/validations/order';

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
 * Decimal money multiplication (quantity * unitPrice) to 4 decimal places precision.
 */
function multiplyMoney(qty: string | number, price: string | number): string {
  const total = Number(qty) * Number(price);
  return total.toFixed(4);
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  customerName: string;
  customerEmail: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'PICKING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  itemCount: number;
  totalQuantity: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDetailItem extends OrderListItem {
  createdByName: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }>;
  reservations: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    reservedQty: string;
    status: 'ACTIVE' | 'FULFILLED' | 'RELEASED';
    createdAt: Date;
  }>;
}

export interface PaginatedOrders {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query sales orders with pagination, status, warehouse filters, and search.
 */
export async function getSalesOrders(
  filters: Partial<QueryOrdersInput> = {}
): Promise<PaginatedOrders> {
  await requirePermission(PERMISSIONS.ORDERS_READ);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.status) {
    conditions.push(eq(salesOrders.status, filters.status));
  }
  if (filters.warehouseId) {
    conditions.push(eq(salesOrders.warehouseId, filters.warehouseId));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(salesOrders.orderNumber, term),
        ilike(salesOrders.customerName, term),
        ilike(salesOrders.customerEmail, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ count: sql<string>`count(*)` })
    .from(salesOrders)
    .where(whereClause);
  const total = parseInt(countResult[0]?.count || '0', 10);

  const rows = await db
    .select({
      id: salesOrders.id,
      orderNumber: salesOrders.orderNumber,
      warehouseId: salesOrders.warehouseId,
      warehouseName: sql<string>`warehouses.name`,
      warehouseCode: sql<string>`warehouses.code`,
      customerName: salesOrders.customerName,
      customerEmail: salesOrders.customerEmail,
      status: salesOrders.status,
      subtotal: salesOrders.subtotal,
      taxAmount: salesOrders.taxAmount,
      totalAmount: salesOrders.totalAmount,
      createdAt: salesOrders.createdAt,
      updatedAt: salesOrders.updatedAt,
      itemCount: sql<number>`count(distinct ${salesOrderItems.id})::int`,
      totalQuantity: sql<string>`coalesce(sum(${salesOrderItems.quantity}), 0)::text`,
    })
    .from(salesOrders)
    .innerJoin(warehouses, eq(warehouses.id, salesOrders.warehouseId))
    .leftJoin(salesOrderItems, eq(salesOrderItems.salesOrderId, salesOrders.id))
    .where(whereClause)
    .groupBy(salesOrders.id, sql`warehouses.name`, sql`warehouses.code`)
    .orderBy(desc(salesOrders.createdAt))
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
 * Retrieve comprehensive details for a specific sales order including lines and active reservations.
 */
export async function getSalesOrderById(id: string): Promise<OrderDetailItem | null> {
  await requirePermission(PERMISSIONS.ORDERS_READ);

  const [order] = await db
    .select({
      id: salesOrders.id,
      orderNumber: salesOrders.orderNumber,
      warehouseId: salesOrders.warehouseId,
      warehouseName: sql<string>`warehouses.name`,
      warehouseCode: sql<string>`warehouses.code`,
      customerName: salesOrders.customerName,
      customerEmail: salesOrders.customerEmail,
      status: salesOrders.status,
      subtotal: salesOrders.subtotal,
      taxAmount: salesOrders.taxAmount,
      totalAmount: salesOrders.totalAmount,
      createdAt: salesOrders.createdAt,
      updatedAt: salesOrders.updatedAt,
      createdByName: sql<string | null>`concat(users.first_name, ' ', users.last_name)`,
    })
    .from(salesOrders)
    .innerJoin(warehouses, eq(warehouses.id, salesOrders.warehouseId))
    .leftJoin(sql`users`, sql`users.id = ${salesOrders.createdBy}`)
    .where(eq(salesOrders.id, id))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select({
      id: salesOrderItems.id,
      productId: salesOrderItems.productId,
      productName: products.name,
      sku: products.sku,
      uom: products.uom,
      quantity: salesOrderItems.quantity,
      unitPrice: salesOrderItems.unitPrice,
      lineTotal: salesOrderItems.lineTotal,
    })
    .from(salesOrderItems)
    .innerJoin(products, eq(products.id, salesOrderItems.productId))
    .where(eq(salesOrderItems.salesOrderId, id))
    .orderBy(products.sku);

  const reservations = await db
    .select({
      id: stockReservations.id,
      productId: stockReservations.productId,
      productName: products.name,
      sku: products.sku,
      reservedQty: stockReservations.reservedQty,
      status: stockReservations.status,
      createdAt: stockReservations.createdAt,
    })
    .from(stockReservations)
    .innerJoin(products, eq(products.id, stockReservations.productId))
    .where(eq(stockReservations.salesOrderId, id))
    .orderBy(products.sku);

  const totalQuantity = items.reduce((acc, it) => acc + Number(it.quantity), 0).toFixed(2);

  return {
    ...order,
    itemCount: items.length,
    totalQuantity,
    items,
    reservations,
  };
}

/**
 * Create a new sales order in DRAFT status.
 */
export async function createSalesOrder(input: CreateSalesOrderInput) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_CREATE);

  // 1. Verify fulfillment warehouse exists and is active
  const [wh] = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, input.warehouseId))
    .limit(1);
  if (!wh) throw new Error('Fulfillment warehouse not found.');
  if (!wh.isActive) throw new Error(`Warehouse '${wh.name}' is inactive.`);

  // 2. Validate products and calculate pricing snapshot
  if (!input.items || input.items.length === 0) {
    throw new Error('At least one product line item is required.');
  }

  let subtotalNum = 0;
  const processedItems: Array<{
    productId: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }> = [];

  for (const item of input.items) {
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for product ${item.productId}.`);
    }

    const [prod] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!prod) throw new Error(`Product ${item.productId} not found.`);
    if (prod.isArchived) {
      throw new Error(`Product '${prod.name}' is archived and cannot be ordered.`);
    }

    const unitPrice = item.unitPrice ? item.unitPrice : prod.sellingPrice;
    const lineTotal = multiplyMoney(qty, unitPrice);
    subtotalNum += Number(lineTotal);

    processedItems.push({
      productId: item.productId,
      quantity: qty.toFixed(2),
      unitPrice: Number(unitPrice).toFixed(4),
      lineTotal,
    });
  }

  const subtotal = subtotalNum.toFixed(4);
  const totalAmount = subtotal; // No tax applied for base sales orders

  // 3. Generate unique order number: SO-YYYYMMDD-XXXX
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let orderNumber = '';
  for (let attempt = 0; attempt < 10; attempt++) {
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `SO-${today}-${randSuffix}`;
    const [existing] = await db
      .select({ id: salesOrders.id })
      .from(salesOrders)
      .where(eq(salesOrders.orderNumber, candidate))
      .limit(1);
    if (!existing) {
      orderNumber = candidate;
      break;
    }
  }
  if (!orderNumber) {
    orderNumber = `SO-${today}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(salesOrders)
      .values({
        orderNumber,
        warehouseId: input.warehouseId,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail || null,
        status: 'DRAFT',
        subtotal,
        taxAmount: '0.0000',
        totalAmount,
        createdBy: actor.id,
      })
      .returning();

    for (const item of processedItems) {
      await tx.insert(salesOrderItems).values({
        salesOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      });
    }

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CREATE',
        entityType: 'ORDER',
        entityId: order.id,
        newValues: {
          orderNumber,
          warehouseId: input.warehouseId,
          customerName: input.customerName,
          totalAmount,
          itemCount: processedItems.length,
        },
      },
      tx
    );

    return order;
  });
}

/**
 * Update an existing DRAFT sales order (permitted only while in DRAFT status).
 */
export async function updateDraftOrder(id: string, input: UpdateDraftOrderInput) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_CREATE);

  return await db.transaction(async (tx) => {
    const lockedRows = await tx.execute<{
      id: string;
      order_number: string;
      warehouse_id: string;
      customer_name: string;
      customer_email: string | null;
      status: string;
    }>(
      sql`SELECT id, order_number, warehouse_id, customer_name, customer_email, status
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const order = lockedRows[0];
    if (!order) throw new Error('Sales order not found.');
    if (order.status !== 'DRAFT') {
      throw new Error(
        `Cannot modify order in '${order.status}' status. Only DRAFT orders can be edited.`
      );
    }

    const warehouseId = input.warehouseId || order.warehouse_id;
    if (input.warehouseId) {
      const [wh] = await tx
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, warehouseId))
        .limit(1);
      if (!wh || !wh.isActive) {
        throw new Error('Fulfillment warehouse is invalid or inactive.');
      }
    }

    let subtotal = '0.0000';
    let totalAmount = '0.0000';

    if (input.items && input.items.length > 0) {
      let subtotalNum = 0;
      await tx.delete(salesOrderItems).where(eq(salesOrderItems.salesOrderId, id));

      for (const item of input.items) {
        const [prod] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);
        if (!prod || prod.isArchived) {
          throw new Error(`Product ${item.productId} not found or archived.`);
        }

        const qty = Number(item.quantity);
        const unitPrice = item.unitPrice ? item.unitPrice : prod.sellingPrice;
        const lineTotal = multiplyMoney(qty, unitPrice);
        subtotalNum += Number(lineTotal);

        await tx.insert(salesOrderItems).values({
          salesOrderId: id,
          productId: item.productId,
          quantity: qty.toFixed(2),
          unitPrice: Number(unitPrice).toFixed(4),
          lineTotal,
        });
      }

      subtotal = subtotalNum.toFixed(4);
      totalAmount = subtotal;
    }

    await tx
      .update(salesOrders)
      .set({
        warehouseId,
        customerName:
          input.customerName !== undefined ? input.customerName.trim() : order.customer_name,
        customerEmail:
          input.customerEmail !== undefined ? input.customerEmail : order.customer_email,
        ...(input.items && input.items.length > 0 ? { subtotal, totalAmount } : {}),
        updatedAt: new Date(),
      })
      .where(eq(salesOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'UPDATE',
        entityType: 'ORDER',
        entityId: id,
        newValues: {
          customerName: input.customerName,
          warehouseId,
          itemCount: input.items?.length,
        },
      },
      tx
    );

    return { id, status: 'DRAFT' };
  });
}

/**
 * Confirm a DRAFT order and reserve stock atomically:
 * Under row lock (canonical order by productId), strictly validates available_qty >= requested_qty,
 * increments reserved_qty on inventory_balances,
 * inserts stock_reservations in ACTIVE status,
 * transitions order status to CONFIRMED.
 */
export async function confirmSalesOrder(id: string, input: ConfirmOrderInput = {}) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_CREATE);

  return await db.transaction(async (tx) => {
    // 1. Lock sales order row
    const lockedOrders = await tx.execute<{
      id: string;
      order_number: string;
      warehouse_id: string;
      status: string;
    }>(
      sql`SELECT id, order_number, warehouse_id, status
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const order = lockedOrders[0];
    if (!order) throw new Error('Sales order not found.');

    if (order.status === 'CONFIRMED') {
      if (input.idempotencyKey) {
        return { id: order.id, status: 'CONFIRMED', alreadyProcessed: true };
      }
      throw new Error(`Order ${order.order_number} has already been confirmed.`);
    }

    if (order.status !== 'DRAFT') {
      throw new Error(
        `Invalid status transition: Cannot confirm order in '${order.status}' status. Only DRAFT orders can be confirmed.`
      );
    }

    // 2. Fetch order line items in sorted order (deadlock avoidance)
    const items = await tx
      .select()
      .from(salesOrderItems)
      .where(eq(salesOrderItems.salesOrderId, id))
      .orderBy(salesOrderItems.productId);

    if (items.length === 0) {
      throw new Error('Cannot confirm order with no line items.');
    }

    // 3. For each line, lock inventory balance and reserve stock
    for (const item of items) {
      const requestedQty = Number(item.quantity);

      // Lock inventory balance row FOR UPDATE
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
            WHERE warehouse_id = ${order.warehouse_id} AND product_id = ${item.productId}
            FOR UPDATE`
      );

      const bal = lockedBalances[0];
      if (!bal) {
        throw new Error(
          `Insufficient stock at fulfillment warehouse: No inventory balance exists for product ${item.productId}.`
        );
      }

      const availableQty = Number(bal.available_qty);
      if (requestedQty > availableQty) {
        throw new Error(
          `Insufficient available stock for product ${item.productId}. Requested: ${requestedQty.toFixed(2)}, Available: ${availableQty.toFixed(2)}.`
        );
      }

      const newReservedQty = addDecimals(bal.reserved_qty, requestedQty);

      // Increase reserved_qty (available_qty automatically decreases via generated column)
      await tx
        .update(inventoryBalances)
        .set({
          reservedQty: newReservedQty,
          updatedAt: new Date(),
        })
        .where(eq(inventoryBalances.id, bal.id));

      // Create stock reservation record in ACTIVE status
      await tx.insert(stockReservations).values({
        salesOrderId: id,
        warehouseId: order.warehouse_id,
        productId: item.productId,
        reservedQty: requestedQty.toFixed(2),
        status: 'ACTIVE',
      });
    }

    // 4. Update order status to CONFIRMED
    const now = new Date();
    await tx
      .update(salesOrders)
      .set({
        status: 'CONFIRMED',
        updatedAt: now,
      })
      .where(eq(salesOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CONFIRM',
        entityType: 'ORDER',
        entityId: id,
        newValues: {
          status: 'CONFIRMED',
          orderNumber: order.order_number,
          itemCount: items.length,
        },
      },
      tx
    );

    return { id: order.id, status: 'CONFIRMED' };
  });
}

/**
 * Transition order from CONFIRMED -> PICKING.
 */
export async function pickSalesOrder(id: string) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_FULFILL);

  return await db.transaction(async (tx) => {
    const lockedOrders = await tx.execute<{
      id: string;
      order_number: string;
      status: string;
    }>(
      sql`SELECT id, order_number, status
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const order = lockedOrders[0];
    if (!order) throw new Error('Sales order not found.');

    if (order.status !== 'CONFIRMED') {
      throw new Error(
        `Invalid status transition: Cannot transition to PICKING from '${order.status}'. Only CONFIRMED orders can be picked.`
      );
    }

    const now = new Date();
    await tx
      .update(salesOrders)
      .set({
        status: 'PICKING',
        updatedAt: now,
      })
      .where(eq(salesOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'PICK',
        entityType: 'ORDER',
        entityId: id,
        newValues: { status: 'PICKING', orderNumber: order.order_number },
      },
      tx
    );

    return { id: order.id, status: 'PICKING' };
  });
}

/**
 * Transition order from PICKING -> PACKED.
 */
export async function packSalesOrder(id: string) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_FULFILL);

  return await db.transaction(async (tx) => {
    const lockedOrders = await tx.execute<{
      id: string;
      order_number: string;
      status: string;
    }>(
      sql`SELECT id, order_number, status
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const order = lockedOrders[0];
    if (!order) throw new Error('Sales order not found.');

    if (order.status !== 'PICKING') {
      throw new Error(
        `Invalid status transition: Cannot transition to PACKED from '${order.status}'. Only PICKING orders can be packed.`
      );
    }

    const now = new Date();
    await tx
      .update(salesOrders)
      .set({
        status: 'PACKED',
        updatedAt: now,
      })
      .where(eq(salesOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'PACK',
        entityType: 'ORDER',
        entityId: id,
        newValues: { status: 'PACKED', orderNumber: order.order_number },
      },
      tx
    );

    return { id: order.id, status: 'PACKED' };
  });
}

/**
 * Dispatch a PACKED (or PICKING/CONFIRMED) order:
 * Consumes the active stock reservations:
 * Decrements on_hand_qty by the dispatched quantity,
 * Decrements reserved_qty by the reservation quantity,
 * Appends DISPATCH immutable inventory movement ledger row,
 * Marks reservations as FULFILLED,
 * Transitions order status to DISPATCHED.
 */
export async function dispatchSalesOrder(id: string, input: DispatchOrderInput = {}) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_FULFILL);

  return await db.transaction(async (tx) => {
    // 1. Lock sales order
    const lockedOrders = await tx.execute<{
      id: string;
      order_number: string;
      warehouse_id: string;
      status: string;
    }>(
      sql`SELECT id, order_number, warehouse_id, status
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const order = lockedOrders[0];
    if (!order) throw new Error('Sales order not found.');

    if (order.status === 'DISPATCHED') {
      if (input.idempotencyKey) {
        return { id: order.id, status: 'DISPATCHED', alreadyProcessed: true };
      }
      throw new Error(`Order ${order.order_number} has already been dispatched.`);
    }

    // Allowed transition from PACKED (or PICKING/CONFIRMED)
    if (!['CONFIRMED', 'PICKING', 'PACKED'].includes(order.status)) {
      throw new Error(
        `Invalid status transition: Cannot dispatch order in '${order.status}' status.`
      );
    }

    // 2. Fetch active reservations in sorted order
    const reservations = await tx
      .select()
      .from(stockReservations)
      .where(and(eq(stockReservations.salesOrderId, id), eq(stockReservations.status, 'ACTIVE')))
      .orderBy(stockReservations.productId);

    if (reservations.length === 0) {
      throw new Error('Order has no active stock reservations to dispatch.');
    }

    // 3. For each reservation, consume stock and release reserved quantity
    for (const res of reservations) {
      const resQty = Number(res.reservedQty);

      // Lock inventory balance row
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
            WHERE warehouse_id = ${order.warehouse_id} AND product_id = ${res.productId}
            FOR UPDATE`
      );

      const bal = lockedBalances[0];
      if (!bal) {
        throw new Error(`Inventory balance record missing for product ${res.productId}.`);
      }

      const balanceBefore = bal.on_hand_qty;
      const balanceAfter = subtractDecimals(balanceBefore, resQty);
      const newReservedQty = subtractDecimals(bal.reserved_qty, resQty);

      if (Number(balanceAfter) < 0 || Number(newReservedQty) < 0) {
        throw new Error(
          'Stock invariant violated: on_hand_qty or reserved_qty cannot become negative.'
        );
      }

      // Update balance: deduct on_hand and release reserved
      await tx
        .update(inventoryBalances)
        .set({
          onHandQty: balanceAfter,
          reservedQty: newReservedQty,
          updatedAt: new Date(),
        })
        .where(eq(inventoryBalances.id, bal.id));

      // Append immutable movement ledger row
      await tx.insert(inventoryMovements).values({
        warehouseId: order.warehouse_id,
        productId: res.productId,
        movementType: 'DISPATCH',
        quantity: resQty.toFixed(2),
        balanceBefore,
        balanceAfter,
        referenceType: 'SALES_ORDER',
        referenceId: order.order_number,
        actorId: actor.id,
        reason: `Sales order dispatch for order ${order.order_number}`,
      });

      // Mark reservation as FULFILLED
      await tx
        .update(stockReservations)
        .set({ status: 'FULFILLED' })
        .where(eq(stockReservations.id, res.id));
    }

    // 4. Update order status to DISPATCHED
    const now = new Date();
    await tx
      .update(salesOrders)
      .set({
        status: 'DISPATCHED',
        updatedAt: now,
      })
      .where(eq(salesOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'DISPATCH',
        entityType: 'ORDER',
        entityId: id,
        newValues: {
          status: 'DISPATCHED',
          orderNumber: order.order_number,
          reservationCount: reservations.length,
        },
      },
      tx
    );

    return { id: order.id, status: 'DISPATCHED' };
  });
}

/**
 * Deliver a DISPATCHED order:
 * Finalizes the order lifecycle.
 * Does NOT alter inventory or movements again.
 */
export async function deliverSalesOrder(id: string) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_FULFILL);

  return await db.transaction(async (tx) => {
    const lockedOrders = await tx.execute<{
      id: string;
      order_number: string;
      status: string;
    }>(
      sql`SELECT id, order_number, status
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const order = lockedOrders[0];
    if (!order) throw new Error('Sales order not found.');

    if (order.status === 'DELIVERED') {
      return { id: order.id, status: 'DELIVERED', alreadyDelivered: true };
    }

    if (order.status !== 'DISPATCHED') {
      throw new Error(
        `Invalid status transition: Cannot mark order as DELIVERED from '${order.status}'. Only DISPATCHED orders can be delivered.`
      );
    }

    const now = new Date();
    await tx
      .update(salesOrders)
      .set({
        status: 'DELIVERED',
        updatedAt: now,
      })
      .where(eq(salesOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'DELIVER',
        entityType: 'ORDER',
        entityId: id,
        newValues: { status: 'DELIVERED', orderNumber: order.order_number },
      },
      tx
    );

    return { id: order.id, status: 'DELIVERED' };
  });
}

/**
 * Cancel a sales order:
 * - If DRAFT: cancels without reservation movements.
 * - If CONFIRMED / PICKING / PACKED: atomically releases all ACTIVE reservations,
 *   decrementing reserved_qty on inventory_balances (which increases available_qty),
 *   marks reservations as RELEASED,
 *   transitions order status to CANCELLED.
 * - If DISPATCHED or DELIVERED: rejects cancellation (inventory has already left warehouse).
 */
export async function cancelSalesOrder(id: string, input: CancelOrderInput = {}) {
  const actor = await requirePermission(PERMISSIONS.ORDERS_CANCEL);

  return await db.transaction(async (tx) => {
    const lockedOrders = await tx.execute<{
      id: string;
      order_number: string;
      warehouse_id: string;
      status: string;
    }>(
      sql`SELECT id, order_number, warehouse_id, status
          FROM sales_orders
          WHERE id = ${id}
          FOR UPDATE`
    );

    const order = lockedOrders[0];
    if (!order) throw new Error('Sales order not found.');

    if (order.status === 'CANCELLED') {
      return { id: order.id, status: 'CANCELLED', alreadyCancelled: true };
    }

    if (order.status === 'DISPATCHED' || order.status === 'DELIVERED') {
      throw new Error(
        `Cannot cancel order in '${order.status}' status. Goods have already been dispatched.`
      );
    }

    // Release any active stock reservations
    const activeReservations = await tx
      .select()
      .from(stockReservations)
      .where(and(eq(stockReservations.salesOrderId, id), eq(stockReservations.status, 'ACTIVE')))
      .orderBy(stockReservations.productId);

    for (const res of activeReservations) {
      const resQty = Number(res.reservedQty);

      // Lock inventory balance row
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
            WHERE warehouse_id = ${order.warehouse_id} AND product_id = ${res.productId}
            FOR UPDATE`
      );

      const bal = lockedBalances[0];
      if (bal) {
        const newReserved = subtractDecimals(bal.reserved_qty, resQty);
        await tx
          .update(inventoryBalances)
          .set({
            reservedQty: newReserved,
            updatedAt: new Date(),
          })
          .where(eq(inventoryBalances.id, bal.id));
      }

      await tx
        .update(stockReservations)
        .set({ status: 'RELEASED' })
        .where(eq(stockReservations.id, res.id));
    }

    const now = new Date();
    await tx
      .update(salesOrders)
      .set({
        status: 'CANCELLED',
        updatedAt: now,
      })
      .where(eq(salesOrders.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CANCEL',
        entityType: 'ORDER',
        entityId: id,
        newValues: {
          status: 'CANCELLED',
          orderNumber: order.order_number,
          reason: input.reason || null,
          releasedReservationsCount: activeReservations.length,
        },
      },
      tx
    );

    return { id: order.id, status: 'CANCELLED' };
  });
}
