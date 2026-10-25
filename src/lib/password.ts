import { hash, verify, Options } from '@node-rs/argon2';

// Recommended OWASP minimums for Argon2id password hashing
const ARGON2_OPTIONS: Options = {
  memoryCost: 65536, // 64 MB memory
  timeCost: 3, // 3 iterations
  parallelism: 4, // 4 threads
  outputLen: 32,
};

/**
 * Hash a plaintext password securely using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext candidate password against an Argon2id hash.
 */
export async function verifyPassword(candidate: string, storedHash: string): Promise<boolean> {
  if (!candidate || !storedHash) {
    return false;
  }
  try {
    return await verify(storedHash, candidate);
  } catch {
    return false;
  }
}
