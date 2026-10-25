import { pgTable, numeric, timestamp, uuid, uniqueIndex, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { warehouses } from './warehouses';
import { products } from './products';

export const inventoryBalances = pgTable(
  'inventory_balances',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    onHandQty: numeric('on_hand_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    reservedQty: numeric('reserved_qty', { precision: 12, scale: 2 }).notNull().default('0.00'),
    quarantinedQty: numeric('quarantined_qty', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    // Persisted generated column strictly enforcing the invariant: Available = On-Hand - Reserved - Quarantined
    availableQty: numeric('available_qty', { precision: 12, scale: 2 })
      .generatedAlwaysAs(sql`on_hand_qty - reserved_qty - quarantined_qty`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    warehouseProductUnique: uniqueIndex('inv_bal_wh_prod_idx').on(
      table.warehouseId,
      table.productId
    ),
    productIdx: index('inv_bal_product_idx').on(table.productId),
    warehouseIdx: index('inv_bal_warehouse_idx').on(table.warehouseId),
    onHandNonNegative: check('inv_bal_on_hand_chk', sql`${table.onHandQty} >= 0`),
    reservedNonNegative: check('inv_bal_reserved_chk', sql`${table.reservedQty} >= 0`),
    quarantinedNonNegative: check('inv_bal_quarantined_chk', sql`${table.quarantinedQty} >= 0`),
    availableNonNegative: check('inv_bal_available_chk', sql`${table.availableQty} >= 0`),
  })
);
