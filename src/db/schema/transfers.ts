import { pgTable, text, numeric, timestamp, uuid, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { transferStatusEnum } from './enums';
import { warehouses } from './warehouses';
import { products } from './products';
import { users } from './users';

export const stockTransfers = pgTable(
  'stock_transfers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    transferNumber: text('transfer_number').notNull().unique(),
    sourceWarehouseId: uuid('source_warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    destinationWarehouseId: uuid('destination_warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    status: transferStatusEnum('status').notNull().default('DRAFT'),
    dispatchedBy: uuid('dispatched_by').references(() => users.id, { onDelete: 'set null' }),
    receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'set null' }),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transferNumberIdx: index('stock_transfers_number_idx').on(table.transferNumber),
    sourceWhIdx: index('stock_transfers_source_wh_idx').on(table.sourceWarehouseId),
    destWhIdx: index('stock_transfers_dest_wh_idx').on(table.destinationWarehouseId),
    statusIdx: index('stock_transfers_status_idx').on(table.status),
    distinctWarehouses: check(
      'stock_transfers_diff_wh_chk',
      sql`${table.sourceWarehouseId} <> ${table.destinationWarehouseId}`
    ),
  })
);

export const stockTransferItems = pgTable(
  'stock_transfer_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stockTransferId: uuid('stock_transfer_id')
      .notNull()
      .references(() => stockTransfers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => ({
    transferIdx: index('stock_transfer_items_transfer_idx').on(table.stockTransferId),
    productIdx: index('stock_transfer_items_product_idx').on(table.productId),
    quantityPositive: check('stock_transfer_items_qty_chk', sql`${table.quantity} > 0`),
  })
);
