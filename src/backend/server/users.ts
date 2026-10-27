import { db } from '@/backend/db';
import { users } from '@/backend/db/schema';
import { eq, ilike, or, desc, sql, SQL } from 'drizzle-orm';
import { requirePermission } from '@/backend/server/auth';
import { PERMISSIONS, UserRole } from '@/shared/permissions';
import { hashPassword } from '@/lib/password';
import { createAuditLog } from '@/backend/server/audit';
import { CreateUserInput, UpdateUserInput } from '@/shared/validations/users';

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface SafeUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getUsers(filters: UserFilters = {}): Promise<SafeUserItem[]> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  const conditions: SQL[] = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(ilike(users.email, term), ilike(users.firstName, term), ilike(users.lastName, term))!
    );
  }

  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt));

  return rows.map((r) => ({
    ...r,
    name: `${r.firstName} ${r.lastName}`,
    role: r.role as UserRole,
  }));
}

export async function getUserById(id: string): Promise<SafeUserItem | null> {
  await requirePermission(PERMISSIONS.USERS_MANAGE);

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    name: `${row.firstName} ${row.lastName}`,
    role: row.role as UserRole,
  };
}

export async function createUser(input: CreateUserInput): Promise<SafeUserItem> {
  const actor = await requirePermission(PERMISSIONS.USERS_MANAGE);

  // Check email uniqueness
  const normalizedEmail = input.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    throw new Error(`A user with email '${normalizedEmail}' already exists.`);
  }

  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      isActive: input.isActive ?? true,
    })
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  await createAuditLog({
    actorId: actor.id,
    action: 'CREATE',
    entityType: 'USER',
    entityId: created.id,
    newValues: {
      email: created.email,
      firstName: created.firstName,
      lastName: created.lastName,
      role: created.role,
      isActive: created.isActive,
    },
  });

  return {
    ...created,
    name: `${created.firstName} ${created.lastName}`,
    role: created.role as UserRole,
  };
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<SafeUserItem> {
  const actor = await requirePermission(PERMISSIONS.USERS_MANAGE);

  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) {
    throw new Error('User not found.');
  }

  // Prevent admin from deactivating their own account
  if (actor.id === id && input.isActive === false) {
    throw new Error('You cannot deactivate your own active session account.');
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.firstName !== undefined) updates.firstName = input.firstName.trim();
  if (input.lastName !== undefined) updates.lastName = input.lastName.trim();
  if (input.role !== undefined) updates.role = input.role;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.password) {
    updates.passwordHash = await hashPassword(input.password);
  }

  const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  });

  await createAuditLog({
    actorId: actor.id,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: updated.id,
    oldValues: {
      firstName: existing.firstName,
      lastName: existing.lastName,
      role: existing.role,
      isActive: existing.isActive,
    },
    newValues: {
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      isActive: updated.isActive,
    },
  });

  return {
    ...updated,
    name: `${updated.firstName} ${updated.lastName}`,
    role: updated.role as UserRole,
  };
}
