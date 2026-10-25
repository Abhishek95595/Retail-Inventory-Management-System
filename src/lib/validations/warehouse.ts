import { z } from 'zod';

export const createWarehouseSchema = z.object({
  code: z
    .string({ required_error: 'Warehouse code is required' })
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_-]{2,30}$/,
      'Warehouse code must be 2-30 alphanumeric characters, hyphens or underscores'
    ),
  name: z
    .string({ required_error: 'Warehouse name is required' })
    .trim()
    .min(2, 'Warehouse name must be at least 2 characters')
    .max(100, 'Warehouse name cannot exceed 100 characters'),
  address: z
    .string()
    .trim()
    .max(500, 'Address cannot exceed 500 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  contactPhone: z
    .string()
    .trim()
    .max(50, 'Contact phone cannot exceed 50 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  isActive: z.boolean().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().extend({
  id: z.string().uuid('Invalid warehouse identifier'),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

export const queryInventoryBalanceSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(['productName', 'sku', 'onHandQty', 'availableQty', 'updatedAt'])
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type QueryInventoryBalanceInput = z.infer<typeof queryInventoryBalanceSchema>;
