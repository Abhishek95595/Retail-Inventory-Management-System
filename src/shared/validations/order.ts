import { z } from 'zod';

export const orderItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z
    .union([z.number(), z.string()])
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Order line quantity must be strictly greater than zero'
    )
    .transform((val) => Number(val).toFixed(2)),
  unitPrice: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Unit price cannot be negative')
    .transform((val) => Number(val).toFixed(4))
    .optional(),
});

export const createSalesOrderSchema = z.object({
  warehouseId: z.string().uuid('Invalid fulfillment warehouse ID'),
  customerName: z
    .string({ required_error: 'Customer name is required' })
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name cannot exceed 100 characters'),
  customerEmail: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  items: z
    .array(orderItemInputSchema)
    .min(1, 'Order must include at least one product item line')
    .max(50, 'Cannot exceed 50 items per order')
    .refine((items) => {
      const ids = items.map((i) => i.productId);
      return new Set(ids).size === ids.length;
    }, 'Duplicate product lines are not permitted. Consolidate into a single line.'),
});

export const updateDraftOrderSchema = z.object({
  warehouseId: z.string().uuid('Invalid warehouse ID').optional(),
  customerName: z
    .string()
    .trim()
    .min(2, 'Customer name must be at least 2 characters')
    .max(100, 'Customer name cannot exceed 100 characters')
    .optional(),
  customerEmail: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  items: z
    .array(orderItemInputSchema)
    .min(1, 'Order must include at least one product item line')
    .max(50, 'Cannot exceed 50 items per order')
    .refine((items) => {
      const ids = items.map((i) => i.productId);
      return new Set(ids).size === ids.length;
    }, 'Duplicate product lines are not permitted. Consolidate into a single line.')
    .optional(),
});

export const confirmOrderSchema = z.object({
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const dispatchOrderSchema = z.object({
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .optional(),
});

export const queryOrdersSchema = z.object({
  status: z
    .enum(['DRAFT', 'CONFIRMED', 'PICKING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'])
    .optional(),
  warehouseId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type OrderItemInput = z.input<typeof orderItemInputSchema>;
export type CreateSalesOrderInput = z.input<typeof createSalesOrderSchema>;
export type UpdateDraftOrderInput = z.input<typeof updateDraftOrderSchema>;
export type ConfirmOrderInput = z.input<typeof confirmOrderSchema>;
export type DispatchOrderInput = z.input<typeof dispatchOrderSchema>;
export type CancelOrderInput = z.input<typeof cancelOrderSchema>;
export type QueryOrdersInput = z.infer<typeof queryOrdersSchema>;
