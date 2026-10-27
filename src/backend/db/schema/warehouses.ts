import { pgTable, text, boolean, timestamp, uuid, index } from 'drizzle-orm/pg-core';

export const warehouses = pgTable(
  'warehouses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    address: text('address'),
    contactPhone: text('contact_phone'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: index('warehouses_code_idx').on(table.code),
    nameIdx: index('warehouses_name_idx').on(table.name),
  })
);
