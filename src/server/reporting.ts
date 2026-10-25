import { db } from '@/db';
import {
  products,
  warehouses,
  inventoryBalances,
  inventoryMovements,
  salesOrders,
  purchaseOrders,
  goodsReceipts,
  auditLogs,
  users,
} from '@/db/schema';
import { eq, and, or, ilike, desc, sql, gte, lte, SQL } from 'drizzle-orm';
import { requirePermission } from '@/server/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { QueryAuditLogsInput, QueryInventoryReportInput } from '@/lib/validations/reporting';

export interface DashboardMetrics {
  counts: {
    activeProducts: number;
    activeWarehouses: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  inventory: {
    totalOnHandQty: string;
    totalReservedQty: string;
    totalAvailableQty: string;
    totalValuation: string;
  };
  salesOrders: Record<string, number>;
  purchaseOrders: Record<string, number>;
  recentMovements: Array<{
    id: string;
    productName: string;
    sku: string;
    warehouseName: string;
    warehouseCode: string;
    movementType: string;
    quantity: string;
    createdAt: Date;
  }>;
  recentReceipts: Array<{
    id: string;
    receiptNumber: string;
    poNumber: string;
    warehouseName: string;
    receivedAt: Date;
    itemCount: number;
    totalQuantityReceived: string;
  }>;
  warehouseSummaries?: Array<{
    id: string;
    name: string;
    code: string;
    productCount: number;
    onHandQty: string;
    availableQty: string;
    valuation: string;
  }>;
}

export interface InventoryReportRow {
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  uom: string;
  costPrice: string;
  sellingPrice: string;
  reorderPoint: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  onHandQty: string;
  reservedQty: string;
  quarantinedQty: string;
  availableQty: string;
  lineValuation: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface PaginatedInventoryReport {
  items: InventoryReportRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalOnHand: string;
    totalAvailable: string;
    totalValuation: string;
  };
}

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface PaginatedAuditLogs {
  items: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Fetch aggregated dashboard metrics across all operational entities.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await requirePermission(PERMISSIONS.REPORTS_READ);

  // 1. Total active products & warehouses
  const [[{ activeProducts }], [{ activeWarehouses }]] = await Promise.all([
    db
      .select({ activeProducts: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.isArchived, false)),
    db
      .select({ activeWarehouses: sql<number>`count(*)::int` })
      .from(warehouses)
      .where(eq(warehouses.isActive, true)),
  ]);

  // 2. Aggregate Inventory Totals and Inventory Valuation
  // Sum over inventory_balances joining products for cost_price
  const [{ totalOnHand, totalReserved, totalAvailable, totalValuation }] = await db
    .select({
      totalOnHand: sql<string>`coalesce(sum(${inventoryBalances.onHandQty}), 0)::text`,
      totalReserved: sql<string>`coalesce(sum(${inventoryBalances.reservedQty}), 0)::text`,
      totalAvailable: sql<string>`coalesce(sum(${inventoryBalances.availableQty}), 0)::text`,
      totalValuation: sql<string>`coalesce(sum(${inventoryBalances.onHandQty} * ${products.costPrice}), 0)::text`,
    })
    .from(inventoryBalances)
    .innerJoin(products, eq(inventoryBalances.productId, products.id));

  // 3. Count products with zero available stock across all active products
  // Product has 0 available if total available across warehouses <= 0 or no balance rows
  const [{ outOfStockCount }] = await db
    .select({
      outOfStockCount: sql<number>`count(*)::int`,
    })
    .from(
      db
        .select({
          productId: products.id,
          totalAvail: sql<number>`coalesce(sum(${inventoryBalances.availableQty}), 0)`,
        })
        .from(products)
        .leftJoin(inventoryBalances, eq(products.id, inventoryBalances.productId))
        .where(eq(products.isArchived, false))
        .groupBy(products.id)
        .having(sql`coalesce(sum(${inventoryBalances.availableQty}), 0) <= 0`)
        .as('sub')
    );

  // 4. Count products at or below reorder level (where total on-hand or available <= reorder_point > 0)
  const [{ lowStockCount }] = await db
    .select({
      lowStockCount: sql<number>`count(*)::int`,
    })
    .from(
      db
        .select({
          productId: products.id,
          reorderPoint: products.reorderPoint,
          totalAvail: sql<number>`coalesce(sum(${inventoryBalances.availableQty}), 0)`,
        })
        .from(products)
        .leftJoin(inventoryBalances, eq(products.id, inventoryBalances.productId))
        .where(and(eq(products.isArchived, false), sql`${products.reorderPoint} > 0`))
        .groupBy(products.id, products.reorderPoint)
        .having(
          sql`coalesce(sum(${inventoryBalances.availableQty}), 0) <= ${products.reorderPoint}`
        )
        .as('sub_low')
    );

  // 5. Sales Orders grouped by status
  const salesStatusCounts = await db
    .select({
      status: salesOrders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(salesOrders)
    .groupBy(salesOrders.status);

  const salesOrderMap: Record<string, number> = {
    DRAFT: 0,
    CONFIRMED: 0,
    PICKING: 0,
    PACKED: 0,
    DISPATCHED: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  for (const row of salesStatusCounts) {
    salesOrderMap[row.status] = row.count;
  }

  // 6. Purchase Orders grouped by status
  const poStatusCounts = await db
    .select({
      status: purchaseOrders.status,
      count: sql<number>`count(*)::int`,
    })
    .from(purchaseOrders)
    .groupBy(purchaseOrders.status);

  const purchaseOrderMap: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    APPROVED: 0,
    PARTIALLY_RECEIVED: 0,
    RECEIVED: 0,
    CANCELLED: 0,
  };
  for (const row of poStatusCounts) {
    purchaseOrderMap[row.status] = row.count;
  }

  // 7. Recent Movements (latest 5)
  const recentMovements = await db
    .select({
      id: inventoryMovements.id,
      productName: products.name,
      sku: products.sku,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      movementType: inventoryMovements.movementType,
      quantity: inventoryMovements.quantity,
      createdAt: inventoryMovements.createdAt,
    })
    .from(inventoryMovements)
    .leftJoin(products, eq(inventoryMovements.productId, products.id))
    .leftJoin(warehouses, eq(inventoryMovements.warehouseId, warehouses.id))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(5);

  // 8. Recent Goods Receipts (latest 5)
  const recentReceipts = await db
    .select({
      id: goodsReceipts.id,
      receiptNumber: goodsReceipts.receiptNumber,
      poNumber: purchaseOrders.poNumber,
      warehouseName: warehouses.name,
      receivedAt: goodsReceipts.receivedAt,
    })
    .from(goodsReceipts)
    .leftJoin(purchaseOrders, eq(goodsReceipts.purchaseOrderId, purchaseOrders.id))
    .leftJoin(warehouses, eq(goodsReceipts.warehouseId, warehouses.id))
    .orderBy(desc(goodsReceipts.receivedAt))
    .limit(5);

  // 9. Aggregate warehouse summaries for multi-facility overview
  const warehouseSummariesRaw = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      code: warehouses.code,
      productCount: sql<number>`coalesce(count(distinct ${inventoryBalances.productId}), 0)::int`,
      onHandQty: sql<string>`coalesce(sum(${inventoryBalances.onHandQty}), 0)::text`,
      availableQty: sql<string>`coalesce(sum(${inventoryBalances.availableQty}), 0)::text`,
      valuation: sql<string>`coalesce(sum(${inventoryBalances.onHandQty} * ${products.costPrice}), 0)::text`,
    })
    .from(warehouses)
    .leftJoin(inventoryBalances, eq(warehouses.id, inventoryBalances.warehouseId))
    .leftJoin(products, eq(inventoryBalances.productId, products.id))
    .where(eq(warehouses.isActive, true))
    .groupBy(warehouses.id)
    .orderBy(warehouses.name);

  return {
    counts: {
      activeProducts: activeProducts || 0,
      activeWarehouses: activeWarehouses || 0,
      lowStockProducts: lowStockCount || 0,
      outOfStockProducts: outOfStockCount || 0,
    },
    inventory: {
      totalOnHandQty: Number(totalOnHand).toFixed(2),
      totalReservedQty: Number(totalReserved).toFixed(2),
      totalAvailableQty: Number(totalAvailable).toFixed(2),
      totalValuation: Number(totalValuation).toFixed(2),
    },
    salesOrders: salesOrderMap,
    purchaseOrders: purchaseOrderMap,
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      productName: m.productName || 'Unknown Product',
      sku: m.sku || 'UNK',
      warehouseName: m.warehouseName || 'Unknown Warehouse',
      warehouseCode: m.warehouseCode || 'UNK',
      movementType: m.movementType,
      quantity: Number(m.quantity).toFixed(2),
      createdAt: m.createdAt,
    })),
    recentReceipts: recentReceipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      poNumber: r.poNumber || 'Unknown PO',
      warehouseName: r.warehouseName || 'Unknown Warehouse',
      receivedAt: r.receivedAt,
      itemCount: 0,
      totalQuantityReceived: '0.00',
    })),
    warehouseSummaries: warehouseSummariesRaw.map((w) => ({
      id: w.id,
      name: w.name,
      code: w.code,
      productCount: w.productCount,
      onHandQty: Number(w.onHandQty).toFixed(2),
      availableQty: Number(w.availableQty).toFixed(2),
      valuation: Number(w.valuation).toFixed(2),
    })),
  };
}

/**
 * Detailed Inventory Report by warehouse and product with low-stock identification and valuation.
 */
export async function getInventoryReport(
  filters: Partial<QueryInventoryReportInput> = {}
): Promise<PaginatedInventoryReport> {
  await requirePermission(PERMISSIONS.REPORTS_READ);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.warehouseId) {
    conditions.push(eq(inventoryBalances.warehouseId, filters.warehouseId));
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
        ilike(warehouses.name, term),
        ilike(warehouses.code, term)
      )!
    );
  }
  if (filters.lowStockOnly) {
    conditions.push(
      and(
        sql`${products.reorderPoint} > 0`,
        sql`${inventoryBalances.availableQty} <= ${products.reorderPoint}`
      )!
    );
  }
  if (filters.outOfStockOnly) {
    conditions.push(sql`${inventoryBalances.availableQty} <= 0`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count, sumOnHand, sumAvailable, sumValuation }] = await db
    .select({
      count: sql<number>`count(*)::int`,
      sumOnHand: sql<string>`coalesce(sum(${inventoryBalances.onHandQty}), 0)::text`,
      sumAvailable: sql<string>`coalesce(sum(${inventoryBalances.availableQty}), 0)::text`,
      sumValuation: sql<string>`coalesce(sum(${inventoryBalances.onHandQty} * ${products.costPrice}), 0)::text`,
    })
    .from(inventoryBalances)
    .innerJoin(products, eq(inventoryBalances.productId, products.id))
    .innerJoin(warehouses, eq(inventoryBalances.warehouseId, warehouses.id))
    .where(whereClause);

  const rows = await db
    .select({
      productId: products.id,
      sku: products.sku,
      productName: products.name,
      categoryName: sql<string>`coalesce((SELECT name FROM categories WHERE id = ${products.categoryId}), 'General')`,
      uom: products.uom,
      costPrice: products.costPrice,
      sellingPrice: products.sellingPrice,
      reorderPoint: products.reorderPoint,
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
      warehouseCode: warehouses.code,
      onHandQty: inventoryBalances.onHandQty,
      reservedQty: inventoryBalances.reservedQty,
      quarantinedQty: inventoryBalances.quarantinedQty,
      availableQty: inventoryBalances.availableQty,
    })
    .from(inventoryBalances)
    .innerJoin(products, eq(inventoryBalances.productId, products.id))
    .innerJoin(warehouses, eq(inventoryBalances.warehouseId, warehouses.id))
    .where(whereClause)
    .orderBy(desc(inventoryBalances.updatedAt))
    .limit(limit)
    .offset(offset);

  const items: InventoryReportRow[] = rows.map((r) => {
    const onHand = Number(r.onHandQty);
    const available = Number(r.availableQty);
    const reorder = Number(r.reorderPoint);
    const cost = Number(r.costPrice);

    return {
      productId: r.productId,
      sku: r.sku,
      productName: r.productName,
      categoryName: r.categoryName,
      uom: r.uom,
      costPrice: cost.toFixed(4),
      sellingPrice: Number(r.sellingPrice).toFixed(4),
      reorderPoint: reorder.toFixed(2),
      warehouseId: r.warehouseId,
      warehouseName: r.warehouseName,
      warehouseCode: r.warehouseCode,
      onHandQty: onHand.toFixed(2),
      reservedQty: Number(r.reservedQty).toFixed(2),
      quarantinedQty: Number(r.quarantinedQty).toFixed(2),
      availableQty: available.toFixed(2),
      lineValuation: (onHand * cost).toFixed(2),
      isLowStock: reorder > 0 && available <= reorder,
      isOutOfStock: available <= 0,
    };
  });

  return {
    items,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit) || 1,
    summary: {
      totalOnHand: Number(sumOnHand).toFixed(2),
      totalAvailable: Number(sumAvailable).toFixed(2),
      totalValuation: Number(sumValuation).toFixed(2),
    },
  };
}

/**
 * Safe CSV export for inventory reports with formula injection protection.
 */
export async function exportInventoryReportCsv(
  filters: Partial<QueryInventoryReportInput> = {}
): Promise<string> {
  await requirePermission(PERMISSIONS.REPORTS_EXPORT);

  // Retrieve up to 2000 rows for CSV
  const report = await getInventoryReport({ ...filters, page: 1, limit: 2000 });

  const headers = [
    'SKU',
    'Product Name',
    'Category',
    'UOM',
    'Warehouse Code',
    'Warehouse Name',
    'On Hand',
    'Reserved',
    'Quarantined',
    'Available',
    'Unit Cost',
    'Valuation ($)',
    'Low Stock Alert',
  ];

  const escapeCsv = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    // Comprehensive protection against CSV formula injection (=, +, -, @, |, %09, tab, CR)
    // Checks if trimmed string or original string starts with formula characters
    if (/^\s*[=+\-@|\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const rows = report.items.map((r) =>
    [
      r.sku,
      r.productName,
      r.categoryName,
      r.uom,
      r.warehouseCode,
      r.warehouseName,
      r.onHandQty,
      r.reservedQty,
      r.quarantinedQty,
      r.availableQty,
      r.costPrice,
      r.lineValuation,
      r.isLowStock ? 'YES' : 'NO',
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Retrieve paginated, filterable audit log records (Restricted to AUDIT_READ).
 * Redacts any sensitive data if present.
 */
export async function getAuditLogs(
  filters: Partial<QueryAuditLogsInput> = {}
): Promise<PaginatedAuditLogs> {
  await requirePermission(PERMISSIONS.AUDIT_READ);

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 25;
  const offset = (page - 1) * limit;

  const conditions: SQL[] = [];

  if (filters.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }
  if (filters.actorId) {
    conditions.push(eq(auditLogs.actorId, filters.actorId));
  }
  if (filters.startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(`${filters.startDate}T00:00:00.000Z`)));
  }
  if (filters.endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(`${filters.endDate}T23:59:59.999Z`)));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, term),
        ilike(auditLogs.entityType, term),
        ilike(auditLogs.entityId, term)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(whereClause);

  const rows = await db
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
      actorEmail: users.email,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  // Redaction helper: sanitize passwordHash, secrets, tokens recursively
  const sanitize = (val: unknown): Record<string, unknown> | null => {
    if (!val || typeof val !== 'object') return null;
    const isSensitiveKey = (key: string): boolean => {
      const lower = key.toLowerCase();
      return (
        lower.includes('password') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('authorization') ||
        lower.includes('apikey')
      );
    };

    const redact = (input: unknown): unknown => {
      if (Array.isArray(input)) {
        return input.map(redact);
      }
      if (input && typeof input === 'object') {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
          if (isSensitiveKey(k)) {
            result[k] = '[REDACTED]';
          } else {
            result[k] = redact(v);
          }
        }
        return result;
      }
      return input;
    };

    return redact(val) as Record<string, unknown>;
  };

  const items: AuditLogRow[] = rows.map((r) => ({
    id: r.id,
    actorId: r.actorId,
    actorName:
      r.actorFirstName && r.actorLastName
        ? `${r.actorFirstName} ${r.actorLastName}`
        : r.actorEmail || 'System / Automated',
    actorEmail: r.actorEmail,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    oldValues: sanitize(r.oldValues),
    newValues: sanitize(r.newValues),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    createdAt: r.createdAt,
  }));

  return {
    items,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit) || 1,
  };
}
