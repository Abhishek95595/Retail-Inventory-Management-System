import { z } from 'zod';

export const userRoleSchema = z.enum([
  'ADMIN',
  'INVENTORY_MANAGER',
  'WAREHOUSE_STAFF',
  'SALES_REP',
  'AUDITOR',
]);

export const createUserSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string().email('Please enter a valid email address')
  ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters'),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  role: userRoleSchema.default('WAREHOUSE_STAFF'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100).optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
