import { db } from '@/backend/db';
import { warehouses, inventoryBalances, inventoryMovements, stockTransfers } from '@/backend/db/schema';
import { eq, and, or, ilike, desc, asc, SQL, sql, AnyColumn } from 'drizzle-orm';
import { requirePermission } from '@/backend/server/auth';
import { PERMISSIONS } from '@/shared/permissions';
import { createAuditLog } from '@/backend/server/audit';
import { CreateWarehouseInput, UpdateWarehouseInput } from '@/shared/validations/warehouse';

export interface WarehouseFilters {
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'code' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  contactPhone: string | null;
  isActive: boolean;
  productCount: number;
  totalQuantity: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List warehouses with search, filter, and balance count aggregation.
 */
export async function getWarehouses(filters: WarehouseFilters = {}): Promise<WarehouseItem[]> {
  await requirePermission(PERMISSIONS.WAREHOUSE_READ);

  const conditions: SQL[] = [];

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(warehouses.name, term), ilike(warehouses.code, term))!);
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(warehouses.isActive, filters.isActive));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderColumn: AnyColumn = warehouses.name;
  if (filters.sortBy === 'code') orderColumn = warehouses.code;
  if (filters.sortBy === 'createdAt') orderColumn = warehouses.createdAt;
  const orderDirection = filters.sortOrder === 'desc' ? desc(orderColumn) : asc(orderColumn);

  const rows = await db
    .select({
      id: warehouses.id,
      code: warehouses.code,
      name: warehouses.name,
      address: warehouses.address,
      contactPhone: warehouses.contactPhone,
      isActive: warehouses.isActive,
      createdAt: warehouses.createdAt,
      updatedAt: warehouses.updatedAt,
      productCount: sql<number>`coalesce(count(distinct ${inventoryBalances.productId}), 0)::int`,
      totalQuantity: sql<string>`coalesce(sum(${inventoryBalances.onHandQty}), 0)::text`,
    })
    .from(warehouses)
    .leftJoin(inventoryBalances, eq(warehouses.id, inventoryBalances.warehouseId))
    .where(whereClause)
    .groupBy(warehouses.id)
    .orderBy(orderDirection);

  return rows;
}

/**
 * Retrieve single warehouse by ID.
 */
export async function getWarehouseById(id: string) {
  await requirePermission(PERMISSIONS.WAREHOUSE_READ);

  const [row] = await db
    .select({
      id: warehouses.id,
      code: warehouses.code,
      name: warehouses.name,
      address: warehouses.address,
      contactPhone: warehouses.contactPhone,
      isActive: warehouses.isActive,
      createdAt: warehouses.createdAt,
      updatedAt: warehouses.updatedAt,
      productCount: sql<number>`coalesce(count(distinct ${inventoryBalances.productId}), 0)::int`,
      totalOnHand: sql<string>`coalesce(sum(${inventoryBalances.onHandQty}), 0)::text`,
      totalAvailable: sql<string>`coalesce(sum(${inventoryBalances.availableQty}), 0)::text`,
      totalReserved: sql<string>`coalesce(sum(${inventoryBalances.reservedQty}), 0)::text`,
      totalQuarantined: sql<string>`coalesce(sum(${inventoryBalances.quarantinedQty}), 0)::text`,
    })
    .from(warehouses)
    .leftJoin(inventoryBalances, eq(warehouses.id, inventoryBalances.warehouseId))
    .where(eq(warehouses.id, id))
    .groupBy(warehouses.id)
    .limit(1);

  return row || null;
}

/**
 * Create a new warehouse.
 */
export async function createWarehouse(input: CreateWarehouseInput) {
  const actor = await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const code = input.code.trim().toUpperCase();

  // Validate Code Uniqueness
  const [existing] = await db
    .select({ id: warehouses.id })
    .from(warehouses)
    .where(eq(warehouses.code, code))
    .limit(1);

  if (existing) {
    throw new Error('A warehouse with this code already exists.');
  }

  return await db.transaction(async (tx) => {
    const [newWarehouse] = await tx
      .insert(warehouses)
      .values({
        code,
        name: input.name.trim(),
        address: input.address?.trim() || null,
        contactPhone: input.contactPhone?.trim() || null,
        isActive: input.isActive ?? true,
      })
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'CREATE',
        entityType: 'WAREHOUSE',
        entityId: newWarehouse.id,
        newValues: newWarehouse,
      },
      tx
    );

    return newWarehouse;
  });
}

/**
 * Update warehouse details.
 */
export async function updateWarehouse(input: UpdateWarehouseInput) {
  const actor = await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const [existing] = await db.select().from(warehouses).where(eq(warehouses.id, input.id)).limit(1);

  if (!existing) {
    throw new Error('Warehouse not found.');
  }

  if (input.code && input.code !== existing.code) {
    const code = input.code.trim().toUpperCase();
    const [duplicate] = await db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(eq(warehouses.code, code), sql`${warehouses.id} <> ${input.id}`))
      .limit(1);

    if (duplicate) {
      throw new Error('A warehouse with this code already exists.');
    }
  }

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(warehouses)
      .set({
        code: input.code ? input.code.trim().toUpperCase() : existing.code,
        name: input.name ? input.name.trim() : existing.name,
        address: input.address !== undefined ? input.address?.trim() || null : existing.address,
        contactPhone:
          input.contactPhone !== undefined
            ? input.contactPhone?.trim() || null
            : existing.contactPhone,
        isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(warehouses.id, input.id))
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'UPDATE',
        entityType: 'WAREHOUSE',
        entityId: updated.id,
        oldValues: existing,
        newValues: updated,
      },
      tx
    );

    return updated;
  });
}

/**
 * Toggle warehouse active/inactive operational status.
 */
export async function toggleWarehouseStatus(id: string, isActive: boolean) {
  const actor = await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const [existing] = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);

  if (!existing) {
    throw new Error('Warehouse not found.');
  }

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(warehouses)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(warehouses.id, id))
      .returning();

    await createAuditLog(
      {
        actorId: actor.id,
        action: isActive ? 'ACTIVATE' : 'DEACTIVATE',
        entityType: 'WAREHOUSE',
        entityId: updated.id,
        oldValues: existing,
        newValues: updated,
      },
      tx
    );

    return updated;
  });
}

/**
 * Delete a warehouse, strictly verifying no dependent records exist.
 */
export async function deleteWarehouse(id: string) {
  const actor = await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const [existing] = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);

  if (!existing) {
    throw new Error('Warehouse not found.');
  }

  // 1. Check inventory balances
  const [balance] = await db
    .select({ id: inventoryBalances.id })
    .from(inventoryBalances)
    .where(eq(inventoryBalances.warehouseId, id))
    .limit(1);

  if (balance) {
    throw new Error(
      'Cannot delete warehouse: existing inventory balances are linked to this facility. Consider deactivating the warehouse instead.'
    );
  }

  // 2. Check stock movements
  const [movement] = await db
    .select({ id: inventoryMovements.id })
    .from(inventoryMovements)
    .where(eq(inventoryMovements.warehouseId, id))
    .limit(1);

  if (movement) {
    throw new Error(
      'Cannot delete warehouse: historical inventory movements reference this facility.'
    );
  }

  // 3. Check transfers
  const [transfer] = await db
    .select({ id: stockTransfers.id })
    .from(stockTransfers)
    .where(
      or(eq(stockTransfers.sourceWarehouseId, id), eq(stockTransfers.destinationWarehouseId, id))
    )
    .limit(1);

  if (transfer) {
    throw new Error('Cannot delete warehouse: historical stock transfers reference this facility.');
  }

  return await db.transaction(async (tx) => {
    await tx.delete(warehouses).where(eq(warehouses.id, id));

    await createAuditLog(
      {
        actorId: actor.id,
        action: 'DELETE',
        entityType: 'WAREHOUSE',
        entityId: id,
        oldValues: existing,
      },
      tx
    );

    return { success: true };
  });
}
