import { z } from 'zod';

export const stockReceiptSchema = z.object({
  warehouseId: z.string().uuid('Invalid warehouse identifier'),
  productId: z.string().uuid('Invalid product identifier'),
  quantity: z
    .union([z.number(), z.string()])
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Receipt quantity must be strictly greater than zero'
    )
    .transform((val) => Number(val).toFixed(2)),
  referenceType: z
    .enum(['MANUAL_RECEIPT', 'PURCHASE_ORDER', 'INITIAL_STOCK', 'RETURN'])
    .default('MANUAL_RECEIPT'),
  referenceId: z
    .string()
    .trim()
    .max(100, 'Reference identifier cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  reason: z
    .string({ required_error: 'Reason is required for receipt' })
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
});

export type StockReceiptInput = z.input<typeof stockReceiptSchema>;
export type StockReceiptOutput = z.output<typeof stockReceiptSchema>;

export const stockIssueSchema = z.object({
  warehouseId: z.string().uuid('Invalid warehouse identifier'),
  productId: z.string().uuid('Invalid product identifier'),
  quantity: z
    .union([z.number(), z.string()])
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Issue quantity must be strictly greater than zero'
    )
    .transform((val) => Number(val).toFixed(2)),
  referenceType: z
    .enum(['MANUAL_ISSUE', 'INTERNAL_CONSUMPTION', 'DAMAGE_DISPOSAL', 'SAMPLE'])
    .default('MANUAL_ISSUE'),
  referenceId: z
    .string()
    .trim()
    .max(100, 'Reference identifier cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  reason: z
    .string({ required_error: 'Reason is required for stock issue' })
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
});

export type StockIssueInput = z.input<typeof stockIssueSchema>;
export type StockIssueOutput = z.output<typeof stockIssueSchema>;

export const stockAdjustmentSchema = z.object({
  warehouseId: z.string().uuid('Invalid warehouse identifier'),
  productId: z.string().uuid('Invalid product identifier'),
  direction: z.enum(['IN', 'OUT'], {
    required_error: 'Adjustment direction (IN or OUT) is required',
  }),
  quantity: z
    .union([z.number(), z.string()])
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Adjustment quantity must be strictly greater than zero'
    )
    .transform((val) => Number(val).toFixed(2)),
  referenceType: z
    .enum(['CYCLE_COUNT', 'PHYSICAL_AUDIT', 'DATA_CORRECTION', 'DAMAGE_WRITEOFF'])
    .default('CYCLE_COUNT'),
  referenceId: z
    .string()
    .trim()
    .max(100, 'Reference identifier cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  reason: z
    .string({ required_error: 'Reason is required for stock adjustment' })
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(500, 'Reason cannot exceed 500 characters'),
  idempotencyKey: z
    .string()
    .trim()
    .max(100, 'Idempotency key cannot exceed 100 characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
});

export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustmentOutput = z.output<typeof stockAdjustmentSchema>;

export const queryMovementsSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  movementType: z
    .enum([
      'RECEIPT',
      'DISPATCH',
      'ADJUSTMENT_IN',
      'ADJUSTMENT_OUT',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'QUARANTINE_HOLD',
      'QUARANTINE_RELEASE',
    ])
    .optional(),
  actorId: z.string().uuid().optional(),
  referenceType: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
  startDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
    ),
  endDate: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
    ),
});

export type QueryMovementsInput = z.infer<typeof queryMovementsSchema>;
