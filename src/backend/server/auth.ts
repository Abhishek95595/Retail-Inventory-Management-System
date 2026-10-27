import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission, type Permission, type UserRole } from '@/shared/permissions';
import { db } from '@/backend/db';
import { users } from '@/backend/db/schema';
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
 * Validates an authenticated user session directly against the database in real-time.
 * Guarantees that deactivated accounts or changed roles are immediately enforced.
 */
export async function verifyUserSession(user: AuthenticatedUser): Promise<AuthenticatedUser> {
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
 * Strict server-side helper requiring an authenticated and active user.
 * Throws an error or returns the user.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }

  return verifyUserSession(user);
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
