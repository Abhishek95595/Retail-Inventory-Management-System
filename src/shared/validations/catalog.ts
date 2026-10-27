import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  code: z
    .string({ required_error: 'Category code is required' })
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_-]{2,30}$/,
      'Code must be 2-30 alphanumeric characters, hyphens or underscores'
    ),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .nullable(),
  parentId: z.string().uuid('Invalid parent category identifier').optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  id: z.string().uuid('Invalid category identifier'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createProductSchema = z.object({
  sku: z
    .string({ required_error: 'SKU is required' })
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9_-]{3,50}$/,
      'SKU must be 3-50 alphanumeric characters, hyphens or underscores'
    ),
  barcode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{4,50}$/, 'Barcode must be 4-50 alphanumeric characters')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(150, 'Product name cannot exceed 150 characters'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description cannot exceed 1000 characters')
    .optional()
    .nullable(),
  categoryId: z.string().uuid('Please select a valid category'),
  preferredSupplierId: z.string().uuid('Invalid supplier reference').optional().nullable(),
  brand: z.string().trim().max(100, 'Brand cannot exceed 100 characters').optional().nullable(),
  uom: z.string().trim().toUpperCase().default('EACH'),
  costPrice: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Cost price cannot be negative')
    .transform((val) => Number(val).toFixed(4)),
  sellingPrice: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Selling price cannot be negative')
    .transform((val) => Number(val).toFixed(4)),
  reorderPoint: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Reorder point cannot be negative')
    .transform((val) => Number(val).toFixed(2)),
  reorderQuantity: z
    .union([z.number(), z.string()])
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Reorder quantity cannot be negative')
    .transform((val) => Number(val).toFixed(2)),
  imageUrl: z
    .string()
    .trim()
    .url('Image must be a valid HTTPS URL')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
});

export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid('Invalid product identifier'),
  isArchived: z.boolean().optional(),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductOutput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type UpdateProductOutput = z.output<typeof updateProductSchema>;
