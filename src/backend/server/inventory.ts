import { db } from '@/backend/db';
import { inventoryBalances, warehouses, products, categories } from '@/backend/db/schema';
import { eq, and, or, ilike, desc, asc, SQL, sql, AnyColumn } from 'drizzle-orm';
import { requirePermission } from '@/backend/server/auth';
import { PERMISSIONS } from '@/shared/permissions';

export interface InventoryBalanceFilters {
  warehouseId?: string;
  productId?: string;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'productName' | 'sku' | 'onHandQty' | 'availableQty' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryBalanceItem {
  id: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseIsActive: boolean;
  productId: string;
  sku: string;
  barcode: string | null;
  productName: string;
  categoryName: string | null;
  uom: string;
  onHandQty: string;
  reservedQty: string;
  quarantinedQty: string;
  availableQty: string;
  updatedAt: Date;
}

export interface PaginatedInventoryBalances {
  items: InventoryBalanceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Query inventory balances with warehouse, category, and search filters.
 */
export async function getInventoryBalances(
  filters: InventoryBalanceFilters = {}
): Promise<PaginatedInventoryBalances> {
  await requirePermission(PERMISSIONS.INVENTORY_READ);

  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 10));
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.warehouseId) {
    conditions.push(eq(inventoryBalances.warehouseId, filters.warehouseId));
  }

  if (filters.productId) {
    conditions.push(eq(inventoryBalances.productId, filters.productId));
  }

  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.sku, term),
        ilike(products.barcode, term),
        ilike(warehouses.name, term),
        ilike(warehouses.code, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Sorting allowlist
  let orderColumn: AnyColumn = inventoryBalances.updatedAt;
  if (filters.sortBy === 'productName') orderColumn = products.name;
  if (filters.sortBy === 'sku') orderColumn = products.sku;
  if (filters.sortBy === 'onHandQty') orderColumn = inventoryBalances.onHandQty;
  if (filters.sortBy === 'availableQty') orderColumn = inventoryBalances.availableQty;

  const orderDirection = filters.sortOrder === 'asc' ? asc(orderColumn) : desc(orderColumn);

  // Total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryBalances)
    .innerJoin(warehouses, eq(inventoryBalances.warehouseId, warehouses.id))
    .innerJoin(products, eq(inventoryBalances.productId, products.id))
    .where(whereClause);

  const total = count;

  // Items
  const items = await db
    .select({
      id: inventoryBalances.id,
      warehouseId: warehouses.id,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      warehouseIsActive: warehouses.isActive,
      productId: products.id,
      sku: products.sku,
      barcode: products.barcode,
      productName: products.name,
      categoryName: categories.name,
      uom: products.uom,
      onHandQty: inventoryBalances.onHandQty,
      reservedQty: inventoryBalances.reservedQty,
      quarantinedQty: inventoryBalances.quarantinedQty,
      availableQty: inventoryBalances.availableQty,
      updatedAt: inventoryBalances.updatedAt,
    })
    .from(inventoryBalances)
    .innerJoin(warehouses, eq(inventoryBalances.warehouseId, warehouses.id))
    .innerJoin(products, eq(inventoryBalances.productId, products.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(whereClause)
    .orderBy(orderDirection)
    .limit(limit)
    .offset(offset);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get all per-warehouse balances for a specific product.
 */
export async function getProductInventoryBalances(productId: string) {
  await requirePermission(PERMISSIONS.INVENTORY_READ);

  return await db
    .select({
      id: inventoryBalances.id,
      warehouseId: warehouses.id,
      warehouseCode: warehouses.code,
      warehouseName: warehouses.name,
      warehouseIsActive: warehouses.isActive,
      onHandQty: inventoryBalances.onHandQty,
      reservedQty: inventoryBalances.reservedQty,
      quarantinedQty: inventoryBalances.quarantinedQty,
      availableQty: inventoryBalances.availableQty,
      updatedAt: inventoryBalances.updatedAt,
    })
    .from(inventoryBalances)
    .innerJoin(warehouses, eq(inventoryBalances.warehouseId, warehouses.id))
    .where(eq(inventoryBalances.productId, productId))
    .orderBy(asc(warehouses.name));
}

/**
 * Helper to ensure a zero-quantity balance row exists for a product/warehouse pair.
 * Strictly adheres to unique constraint (warehouse_id, product_id) and 0.00 default quantities.
 * Does not allow arbitrary stock inputs.
 */
export async function ensureZeroBalanceRecord(warehouseId: string, productId: string) {
  await requirePermission(PERMISSIONS.WAREHOUSE_MANAGE);

  const [existing] = await db
    .select({ id: inventoryBalances.id })
    .from(inventoryBalances)
    .where(
      and(
        eq(inventoryBalances.warehouseId, warehouseId),
        eq(inventoryBalances.productId, productId)
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(inventoryBalances)
    .values({
      warehouseId,
      productId,
      onHandQty: '0.00',
      reservedQty: '0.00',
      quarantinedQty: '0.00',
    })
    .returning();

  return created;
}
