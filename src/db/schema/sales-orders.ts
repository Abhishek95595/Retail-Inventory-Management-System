import { pgTable, text, numeric, timestamp, uuid, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orderStatusEnum, reservationStatusEnum } from './enums';
import { warehouses } from './warehouses';
import { products } from './products';
import { users } from './users';

export const salesOrders = pgTable(
  'sales_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    customerName: text('customer_name').notNull(),
    customerEmail: text('customer_email'),
    status: orderStatusEnum('status').notNull().default('DRAFT'),
    subtotal: numeric('subtotal', { precision: 12, scale: 4 }).notNull().default('0.0000'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 4 }).notNull().default('0.0000'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 4 }).notNull().default('0.0000'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderNumberIdx: index('sales_orders_number_idx').on(table.orderNumber),
    warehouseIdx: index('sales_orders_warehouse_idx').on(table.warehouseId),
    statusIdx: index('sales_orders_status_idx').on(table.status),
    totalNonNegative: check('sales_orders_total_chk', sql`${table.totalAmount} >= 0`),
  })
);

export const salesOrderItems = pgTable(
  'sales_order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salesOrderId: uuid('sales_order_id')
      .notNull()
      .references(() => salesOrders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 4 }).notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 4 }).notNull(),
  },
  (table) => ({
    orderIdx: index('sales_order_items_order_idx').on(table.salesOrderId),
    productIdx: index('sales_order_items_product_idx').on(table.productId),
    quantityPositive: check('sales_order_items_qty_chk', sql`${table.quantity} > 0`),
    unitPriceNonNegative: check('sales_order_items_price_chk', sql`${table.unitPrice} >= 0`),
  })
);

export const stockReservations = pgTable(
  'stock_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    salesOrderId: uuid('sales_order_id')
      .notNull()
      .references(() => salesOrders.id, { onDelete: 'cascade' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    reservedQty: numeric('reserved_qty', { precision: 12, scale: 2 }).notNull(),
    status: reservationStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index('stock_reservations_order_idx').on(table.salesOrderId),
    whProdIdx: index('stock_reservations_wh_prod_idx').on(table.warehouseId, table.productId),
    statusIdx: index('stock_reservations_status_idx').on(table.status),
    reservedQtyPositive: check('stock_reservations_qty_chk', sql`${table.reservedQty} > 0`),
  })
);
