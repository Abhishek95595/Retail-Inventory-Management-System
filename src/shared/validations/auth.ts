import { z } from 'zod';

export const loginSchema = z.object({
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().toLowerCase() : val),
    z.string({ required_error: 'Email is required' }).email('Please enter a valid email address')
  ),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
});

export type LoginInput = z.infer<typeof loginSchema>;
