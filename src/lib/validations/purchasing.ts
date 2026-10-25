import { z } from 'zod';

export const poItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantityOrdered: z
    .union([z.number(), z.string()])
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Order line quantity must be strictly greater than zero'
    )
    .transform((val) => Number(val).toFixed(2)),
  unitCost: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Unit cost cannot be negative')
    .transform((val) => Number(val).toFixed(4))
    .optional(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID'),
  destinationWarehouseId: z.string().uuid('Invalid destination warehouse ID'),
  expectedArrivalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected arrival date must be in YYYY-MM-DD format')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  items: z
    .array(poItemInputSchema)
    .min(1, 'Purchase order must include at least one product item line')
    .max(50, 'Cannot exceed 50 items per purchase order')
    .refine((items) => {
      const ids = items.map((i) => i.productId);
      return new Set(ids).size === ids.length;
    }, 'Duplicate product lines are not permitted. Consolidate into a single line.'),
});

export const updateDraftPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid supplier ID').optional(),
  destinationWarehouseId: z.string().uuid('Invalid destination warehouse ID').optional(),
  expectedArrivalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected arrival date must be in YYYY-MM-DD format')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  items: z
    .array(poItemInputSchema)
    .min(1, 'Purchase order must include at least one product item line')
    .max(50, 'Cannot exceed 50 items per purchase order')
    .refine((items) => {
      const ids = items.map((i) => i.productId);
      return new Set(ids).size === ids.length;
    }, 'Duplicate product lines are not permitted. Consolidate into a single line.')
    .optional(),
});

export const cancelPurchaseOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .optional(),
});

export const queryPurchaseOrdersSchema = z.object({
  status: z
    .enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'])
    .optional(),
  supplierId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const goodsReceiptLineInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantityReceived: z
    .union([z.number(), z.string()])
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Received quantity must be strictly greater than zero'
    )
    .transform((val) => Number(val).toFixed(2)),
  unitCost: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Unit cost cannot be negative')
    .transform((val) => Number(val).toFixed(4))
    .optional(),
});

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().uuid('Invalid purchase order ID'),
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  items: z
    .array(goodsReceiptLineInputSchema)
    .min(1, 'Receipt must include at least one product item line')
    .max(50, 'Cannot exceed 50 items per receipt')
    .refine((items) => {
      const ids = items.map((i) => i.productId);
      return new Set(ids).size === ids.length;
    }, 'Duplicate product lines are not permitted in a single receipt. Consolidate lines.'),
});

export const queryGoodsReceiptsSchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type POItemInput = z.infer<typeof poItemInputSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdateDraftPurchaseOrderInput = z.infer<typeof updateDraftPurchaseOrderSchema>;
export type CancelPurchaseOrderInput = z.infer<typeof cancelPurchaseOrderSchema>;
export type QueryPurchaseOrdersInput = z.infer<typeof queryPurchaseOrdersSchema>;

export type GoodsReceiptLineInput = z.infer<typeof goodsReceiptLineInputSchema>;
export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;
export type QueryGoodsReceiptsInput = z.infer<typeof queryGoodsReceiptsSchema>;
