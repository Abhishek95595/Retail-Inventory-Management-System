import { pgTable, text, timestamp, uuid, index, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    description: text('description'),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    parentIdx: index('categories_parent_idx').on(table.parentId),
    codeIdx: index('categories_code_idx').on(table.code),
  })
);
