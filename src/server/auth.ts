import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, type Permission, type UserRole } from '@/lib/permissions';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

/**
 * Retrieves the current session user. Returns null if unauthenticated.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return session.user as AuthenticatedUser;
}

/**
 * Strict server-side helper requiring an authenticated and active user.
 * Throws an error or returns the user.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  // Live database verification to ensure account has not been deactivated or deleted mid-session
  const [dbUser] = await db
    .select({
      id: users.id,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser || !dbUser.isActive) {
    throw new Error('ACCOUNT_DEACTIVATED');
  }

  return {
    ...user,
    role: dbUser.role as UserRole,
    isActive: dbUser.isActive,
  };
}

/**
 * Server-side guard requiring a specific RBAC permission.
 * Validates permission against live user role.
 */
export async function requirePermission(permission: Permission): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!hasPermission(user.role, permission)) {
    throw new Error('FORBIDDEN');
  }

  return user;
}
