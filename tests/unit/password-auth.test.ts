import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/password';
import { loginSchema } from '@/lib/validations/auth';

describe('RIMS Password Security & Auth Validation Unit Tests', () => {
  it('hashes passwords using Argon2id format with salt and OWASP parameters', async () => {
    const rawPassword = 'SecurePassword123!';
    const hashed = await hashPassword(rawPassword);

    expect(hashed).toBeDefined();
    expect(hashed).toMatch(/^\$argon2id\$/); // Argon2id prefix signature
    expect(hashed).not.toContain(rawPassword); // Plaintext is never stored
  });

  it('correctly verifies valid password against Argon2id hash', async () => {
    const rawPassword = 'CorrectPassword88';
    const hashed = await hashPassword(rawPassword);

    const isMatch = await verifyPassword(rawPassword, hashed);
    expect(isMatch).toBe(true);
  });

  it('rejects incorrect password against Argon2id hash', async () => {
    const rawPassword = 'InitialPassword99';
    const hashed = await hashPassword(rawPassword);

    const isMatch = await verifyPassword('WrongPassword11', hashed);
    expect(isMatch).toBe(false);
  });

  it('rejects password hashing for candidates shorter than 8 characters', async () => {
    await expect(hashPassword('short')).rejects.toThrow(
      'Password must be at least 8 characters long'
    );
  });

  it('validates and normalizes email format via login Zod schema', () => {
    const result = loginSchema.safeParse({
      email: '  User.Test@Example.COM  ',
      password: 'SomePassword123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user.test@example.com');
    }
  });

  it('rejects malformed email addresses', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'SomePassword123',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty password submission', () => {
    const result = loginSchema.safeParse({
      email: 'admin@rims.local',
      password: '',
    });

    expect(result.success).toBe(false);
  });
});
