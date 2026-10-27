import { db } from '@/backend/db';
import { auditLogs } from '@/backend/db/schema';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: string;
  entityType:
    | 'PRODUCT'
    | 'CATEGORY'
    | 'WAREHOUSE'
    | 'BALANCE'
    | 'USER'
    | 'ORDER'
    | 'PURCHASE_ORDER'
    | 'MOVEMENT'
    | 'TRANSFER';
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Reusable server-side helper to record immutable audit log entries.
 * Can be executed within an optional external Drizzle transaction or standalone.
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<void> {
  const executor = tx || db;

  await executor.insert(auditLogs).values({
    actorId: params.actorId || null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValues: params.oldValues || null,
    newValues: params.newValues || null,
    ipAddress: params.ipAddress || null,
    userAgent: params.userAgent || null,
  });
}
