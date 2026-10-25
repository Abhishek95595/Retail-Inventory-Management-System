import {
  pgTable,
  text,
  boolean,
  numeric,
  timestamp,
  uuid,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { categories } from './categories';
import { suppliers } from './suppliers';

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sku: text('sku').notNull().unique(),
    barcode: text('barcode').unique(),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    preferredSupplierId: uuid('preferred_supplier_id').references(() => suppliers.id, {
      onDelete: 'set null',
    }),
    brand: text('brand'),
    uom: text('uom').notNull().default('EACH'), // Unit of Measure (EACH, KG, LITER, METER)
    costPrice: numeric('cost_price', { precision: 12, scale: 4 }).notNull().default('0.0000'),
    sellingPrice: numeric('selling_price', { precision: 12, scale: 4 }).notNull().default('0.0000'),
    reorderPoint: numeric('reorder_point', { precision: 12, scale: 2 }).notNull().default('0.00'),
    reorderQuantity: numeric('reorder_quantity', { precision: 12, scale: 2 })
      .notNull()
      .default('0.00'),
    imageUrl: text('image_url'),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    skuIdx: index('products_sku_idx').on(table.sku),
    barcodeIdx: index('products_barcode_idx').on(table.barcode),
    categoryIdx: index('products_category_idx').on(table.categoryId),
    supplierIdx: index('products_supplier_idx').on(table.preferredSupplierId),
    costPriceNonNegative: check('products_cost_price_chk', sql`${table.costPrice} >= 0`),
    sellingPriceNonNegative: check('products_selling_price_chk', sql`${table.sellingPrice} >= 0`),
    reorderPointNonNegative: check('products_reorder_point_chk', sql`${table.reorderPoint} >= 0`),
    reorderQuantityNonNegative: check(
      'products_reorder_qty_chk',
      sql`${table.reorderQuantity} >= 0`
    ),
  })
);
