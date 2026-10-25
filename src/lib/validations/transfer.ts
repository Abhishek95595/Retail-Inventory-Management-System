import { z } from 'zod';

export const transferItemInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z
    .union([z.number(), z.string()])
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Transfer quantity must be strictly greater than zero'
    )
    .transform((val) => Number(val).toFixed(2)),
});

export const createTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid('Invalid source warehouse ID'),
  destinationWarehouseId: z.string().uuid('Invalid destination warehouse ID'),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  items: z
    .array(transferItemInputSchema)
    .min(1, 'Transfer must include at least one product item')
    .max(50, 'Cannot exceed 50 items per transfer request')
    .refine((items) => {
      const ids = items.map((i) => i.productId);
      return new Set(ids).size === ids.length;
    }, 'Duplicate product items in transfer are not permitted. Consolidate into a single line.'),
});

export const updateDraftTransferSchema = z.object({
  destinationWarehouseId: z.string().uuid('Invalid destination warehouse ID').optional(),
  notes: z
    .string()
    .trim()
    .max(500, 'Notes cannot exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  items: z
    .array(transferItemInputSchema)
    .min(1, 'Transfer must include at least one product item')
    .max(50, 'Cannot exceed 50 items per transfer request')
    .refine((items) => {
      const ids = items.map((i) => i.productId);
      return new Set(ids).size === ids.length;
    }, 'Duplicate product items in transfer are not permitted. Consolidate into a single line.')
    .optional(),
});

export const dispatchTransferSchema = z.object({
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const receiveTransferSchema = z.object({
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const cancelTransferSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters')
    .max(500, 'Cancellation reason cannot exceed 500 characters')
    .optional(),
});

export const queryTransfersSchema = z.object({
  status: z.enum(['DRAFT', 'DISPATCHED', 'RECEIVED', 'CANCELLED']).optional(),
  sourceWarehouseId: z.string().uuid().optional(),
  destinationWarehouseId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type TransferItemInput = z.input<typeof transferItemInputSchema>;
export type CreateTransferInput = z.input<typeof createTransferSchema>;
export type UpdateDraftTransferInput = z.input<typeof updateDraftTransferSchema>;
export type DispatchTransferInput = z.input<typeof dispatchTransferSchema>;
export type ReceiveTransferInput = z.input<typeof receiveTransferSchema>;
export type CancelTransferInput = z.input<typeof cancelTransferSchema>;
export type QueryTransfersInput = z.infer<typeof queryTransfersSchema>;
