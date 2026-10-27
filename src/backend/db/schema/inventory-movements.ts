import { pgTable, text, numeric, timestamp, uuid, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { movementTypeEnum } from './enums';
import { warehouses } from './warehouses';
import { products } from './products';
import { users } from './users';

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    movementType: movementTypeEnum('movement_type').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    balanceBefore: numeric('balance_before', { precision: 12, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { precision: 12, scale: 2 }).notNull(),
    referenceType: text('reference_type').notNull(), // SALES_ORDER, PURCHASE_ORDER, TRANSFER, ADJUSTMENT
    referenceId: text('reference_id').notNull(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    warehouseIdx: index('inv_mov_warehouse_idx').on(table.warehouseId),
    productIdx: index('inv_mov_product_idx').on(table.productId),
    typeIdx: index('inv_mov_type_idx').on(table.movementType),
    referenceIdx: index('inv_mov_ref_idx').on(table.referenceType, table.referenceId),
    createdAtIdx: index('inv_mov_created_at_idx').on(table.createdAt),
    quantityNonZero: check('inv_mov_qty_nonzero_chk', sql`${table.quantity} <> 0`),
  })
);
