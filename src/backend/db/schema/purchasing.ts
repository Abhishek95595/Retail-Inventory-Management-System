import { pgTable, text, numeric, date, timestamp, uuid, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { purchaseOrderStatusEnum } from './enums';
import { suppliers } from './suppliers';
import { warehouses } from './warehouses';
import { products } from './products';
import { users } from './users';

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    poNumber: text('po_number').notNull().unique(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    destinationWarehouseId: uuid('destination_warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    status: purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
    totalCost: numeric('total_cost', { precision: 12, scale: 4 }).notNull().default('0.0000'),
    expectedArrivalDate: date('expected_arrival_date'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    poNumberIdx: index('po_number_idx').on(table.poNumber),
    supplierIdx: index('po_supplier_idx').on(table.supplierId),
    warehouseIdx: index('po_dest_wh_idx').on(table.destinationWarehouseId),
    statusIdx: index('po_status_idx').on(table.status),
    totalCostNonNegative: check('po_total_cost_chk', sql`${table.totalCost} >= 0`),
  })
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityOrdered: numeric('quantity_ordered', { precision: 12, scale: 2 }).notNull(),
    quantityReceived: numeric('quantity_received', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    unitCost: numeric('unit_cost', { precision: 12, scale: 4 }).notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 4 }).notNull(),
  },
  (table) => ({
    poIdx: index('po_items_po_idx').on(table.purchaseOrderId),
    productIdx: index('po_items_prod_idx').on(table.productId),
    qtyOrderedPositive: check('po_items_qty_ord_chk', sql`${table.quantityOrdered} > 0`),
    qtyReceivedNonNegative: check('po_items_qty_rec_chk', sql`${table.quantityReceived} >= 0`),
    unitCostNonNegative: check('po_items_cost_chk', sql`${table.unitCost} >= 0`),
  })
);

export const goodsReceipts = pgTable(
  'goods_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    receiptNumber: text('receipt_number').notNull().unique(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'restrict' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'set null' }),
    idempotencyKey: text('idempotency_key').unique(),
    notes: text('notes'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    receiptNumberIdx: index('goods_receipts_number_idx').on(table.receiptNumber),
    poIdx: index('goods_receipts_po_idx').on(table.purchaseOrderId),
    warehouseIdx: index('goods_receipts_warehouse_idx').on(table.warehouseId),
    idempotencyIdx: index('goods_receipts_idempotency_idx').on(table.idempotencyKey),
  })
);

export const goodsReceiptItems = pgTable(
  'goods_receipt_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsReceiptId: uuid('goods_receipt_id')
      .notNull()
      .references(() => goodsReceipts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityReceived: numeric('quantity_received', { precision: 12, scale: 2 }).notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 4 }).notNull(),
  },
  (table) => ({
    receiptIdx: index('gr_items_receipt_idx').on(table.goodsReceiptId),
    productIdx: index('gr_items_product_idx').on(table.productId),
    qtyReceivedPositive: check('gr_items_qty_chk', sql`${table.quantityReceived} > 0`),
    unitCostNonNegative: check('gr_items_cost_chk', sql`${table.unitCost} >= 0`),
  })
);
