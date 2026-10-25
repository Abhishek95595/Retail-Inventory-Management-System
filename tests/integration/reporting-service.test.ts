import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/db';
import { warehouses, categories, products, inventoryBalances, auditLogs } from '@/db/schema';
import {
  getDashboardMetrics,
  getInventoryReport,
  exportInventoryReportCsv,
  getAuditLogs,
} from '@/server/reporting';
import { eq, inArray } from 'drizzle-orm';

const mockCurrentUser = {
  id: '7b7d58da-d45a-411d-bd0e-c42f65521482',
  email: 'admin@rims.local',
  name: 'System Administrator',
  role: 'ADMIN',
  isActive: true,
};

vi.mock('@/server/auth', () => ({
  requirePermission: vi.fn(async (perm: string) => {
    // If testing permission denial, check role
    if (mockCurrentUser.role === 'WAREHOUSE_STAFF') {
      throw new Error(`Forbidden: missing permission ${perm}`);
    }
    return mockCurrentUser;
  }),
  requireAuth: vi.fn(async () => mockCurrentUser),
}));

describe('RIMS Phase 10: Operational Dashboards, Reporting & Audit Review', () => {
  let warehouseId: string;
  let categoryId: string;
  let normalProductId: string;
  let lowStockProductId: string;
  let zeroStockProductId: string;
  const ts = Date.now();

  beforeAll(async () => {
    // 1. Create a dedicated test warehouse
    const [wh] = await db
      .insert(warehouses)
      .values({
        code: `WH-REP-${ts}`,
        name: `Reporting Warehouse ${ts}`,
        isActive: true,
      })
      .returning();
    warehouseId = wh.id;

    // 2. Create a category
    const [cat] = await db
      .insert(categories)
      .values({
        code: `CAT-REP-${ts}`,
        name: `Reporting Category ${ts}`,
        description: 'Test category for reports',
      })
      .returning();
    categoryId = cat.id;

    // 3. Create products with distinct inventory profiles:
    // Product A: Normal stock (reorderPoint 10, balance 50)
    // Product B: Low stock (reorderPoint 20, balance 15 available)
    // Product C: Zero stock (reorderPoint 5, balance 0 available)
    const [prodA] = await db
      .insert(products)
      .values({
        sku: `SKU-REP-NORM-${ts}`,
        name: `Normal Product ${ts}`,
        categoryId,
        uom: 'PCS',
        costPrice: '12.5000',
        sellingPrice: '20.0000',
        reorderPoint: '10.00',
        isArchived: false,
      })
      .returning();
    normalProductId = prodA.id;

    const [prodB] = await db
      .insert(products)
      .values({
        sku: `SKU-REP-LOW-${ts}`,
        name: `Low Stock Product ${ts}`,
        categoryId,
        uom: 'PCS',
        costPrice: '25.0000',
        sellingPrice: '40.0000',
        reorderPoint: '20.00',
        isArchived: false,
      })
      .returning();
    lowStockProductId = prodB.id;

    const [prodC] = await db
      .insert(products)
      .values({
        sku: `SKU-REP-ZERO-${ts}`,
        name: `=FormulaInjectionZero ${ts}`, // Tests CSV formula escaping
        categoryId,
        uom: 'PCS',
        costPrice: '5.0000',
        sellingPrice: '10.0000',
        reorderPoint: '5.00',
        isArchived: false,
      })
      .returning();
    zeroStockProductId = prodC.id;

    // 4. Create inventory balances:
    // prodA: onHand 50, reserved 5 -> available 45 (> 10 normal)
    await db.insert(inventoryBalances).values({
      warehouseId,
      productId: normalProductId,
      onHandQty: '50.00',
      reservedQty: '5.00',
      quarantinedQty: '0.00',
    });

    // prodB: onHand 15, reserved 0 -> available 15 (<= 20 low stock)
    await db.insert(inventoryBalances).values({
      warehouseId,
      productId: lowStockProductId,
      onHandQty: '15.00',
      reservedQty: '0.00',
      quarantinedQty: '0.00',
    });

    // prodC: onHand 10, reserved 10 -> available 0 (zero stock!)
    await db.insert(inventoryBalances).values({
      warehouseId,
      productId: zeroStockProductId,
      onHandQty: '10.00',
      reservedQty: '10.00',
      quarantinedQty: '0.00',
    });

    // 5. Insert test audit log
    await db.insert(auditLogs).values({
      actorId: mockCurrentUser.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'INVENTORY',
      entityId: normalProductId,
      newValues: {
        adjustedQty: 50,
        passwordHash: 'secret123', // Must be redacted
      },
      ipAddress: '127.0.0.1',
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    if (normalProductId) {
      await db.delete(auditLogs).where(eq(auditLogs.entityId, normalProductId));
    }
    const productIds = [normalProductId, lowStockProductId, zeroStockProductId].filter(Boolean);
    if (productIds.length > 0) {
      await db.delete(inventoryBalances).where(inArray(inventoryBalances.productId, productIds));
      await db.delete(products).where(inArray(products.id, productIds));
    }
    if (categoryId) {
      await db.delete(categories).where(eq(categories.id, categoryId));
    }
    if (warehouseId) {
      await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    }
  });

  describe('1. Dashboard Metrics Aggregations', () => {
    it('returns positive counts for active products and warehouses', async () => {
      const metrics = await getDashboardMetrics();
      expect(metrics.counts.activeProducts).toBeGreaterThanOrEqual(3);
      expect(metrics.counts.activeWarehouses).toBeGreaterThanOrEqual(1);
      expect(metrics.counts.lowStockProducts).toBeGreaterThanOrEqual(1);
      expect(metrics.counts.outOfStockProducts).toBeGreaterThanOrEqual(1);
    });

    it('calculates inventory totals and valuation correctly', async () => {
      const metrics = await getDashboardMetrics();
      expect(parseFloat(metrics.inventory.totalOnHandQty)).toBeGreaterThanOrEqual(75);
      expect(parseFloat(metrics.inventory.totalReservedQty)).toBeGreaterThanOrEqual(15);
      expect(parseFloat(metrics.inventory.totalValuation)).toBeGreaterThan(0);
    });

    it('returns sales and purchase order lifecycle breakdown structures', async () => {
      const metrics = await getDashboardMetrics();
      expect(metrics.salesOrders).toHaveProperty('DRAFT');
      expect(metrics.salesOrders).toHaveProperty('CONFIRMED');
      expect(metrics.purchaseOrders).toHaveProperty('DRAFT');
      expect(metrics.purchaseOrders).toHaveProperty('APPROVED');
    });
  });

  describe('2. Detailed Inventory Valuation & Facility Reports', () => {
    it('retrieves paginated inventory report filtering by warehouse', async () => {
      const report = await getInventoryReport({
        warehouseId,
        page: 1,
        limit: 10,
      });

      expect(report.total).toBe(3);
      expect(report.items).toHaveLength(3);
      expect(report.summary.totalOnHand).toBe('75.00'); // 50 + 15 + 10
      expect(report.summary.totalAvailable).toBe('60.00'); // 45 + 15 + 0
      // Valuation = (50 * 12.50) + (15 * 25.00) + (10 * 5.00) = 625 + 375 + 50 = 1050.00
      expect(report.summary.totalValuation).toBe('1050.00');
    });

    it('filters low-stock items correctly based on reorderPoint threshold', async () => {
      const report = await getInventoryReport({
        warehouseId,
        lowStockOnly: true,
      });

      // Both prodB (15 <= 20) and prodC (0 <= 5) should match low stock
      expect(report.items.length).toBeGreaterThanOrEqual(2);
      const skus = report.items.map((i) => i.sku);
      expect(skus).toContain(`SKU-REP-LOW-${ts}`);
      expect(skus).toContain(`SKU-REP-ZERO-${ts}`);
      expect(skus).not.toContain(`SKU-REP-NORM-${ts}`);
    });

    it('filters zero/out-of-stock items correctly', async () => {
      const report = await getInventoryReport({
        warehouseId,
        outOfStockOnly: true,
      });

      expect(report.items.length).toBe(1);
      expect(report.items[0].productId).toBe(zeroStockProductId);
      expect(report.items[0].availableQty).toBe('0.00');
      expect(report.items[0].isOutOfStock).toBe(true);
    });
  });

  describe('3. CSV Export & Formula Injection Protection', () => {
    it('exports CSV with proper headers and spreadsheet injection sanitization', async () => {
      const csv = await exportInventoryReportCsv({ warehouseId });

      expect(csv).toContain('SKU,Product Name,Category,UOM');
      // Verify formula injection protection: product name starts with '=', must be prefixed with single quote
      expect(csv).toContain('"\'=FormulaInjectionZero');
      expect(csv).toContain(`WH-REP-${ts}`);
    });
  });

  describe('4. Audit Log Review & Redaction', () => {
    it('retrieves audit logs with actor and entity filters', async () => {
      const audit = await getAuditLogs({
        entityId: normalProductId,
        limit: 10,
      });

      expect(audit.items.length).toBeGreaterThanOrEqual(1);
      const record = audit.items.find((r) => r.entityId === normalProductId);
      expect(record).toBeDefined();
      expect(record?.action).toBe('STOCK_ADJUSTMENT');
      expect(record?.entityType).toBe('INVENTORY');

      // Verify sensitive field redaction
      expect(record?.newValues).toBeDefined();
      expect((record?.newValues as any)?.passwordHash).toBe('[REDACTED]');
      expect((record?.newValues as any)?.adjustedQty).toBe(50);
    });

    it('enforces RBAC and rejects unauthorized roles from viewing audit logs', async () => {
      // Temporarily switch role to WAREHOUSE_STAFF (no AUDIT_READ)
      const prevRole = mockCurrentUser.role;
      mockCurrentUser.role = 'WAREHOUSE_STAFF';

      try {
        await expect(getAuditLogs()).rejects.toThrow(/Forbidden/);
      } finally {
        mockCurrentUser.role = prevRole;
      }
    });

    it('enforces RBAC and rejects unauthorized roles from exporting CSV', async () => {
      const prevRole = mockCurrentUser.role;
      mockCurrentUser.role = 'WAREHOUSE_STAFF';

      try {
        await expect(exportInventoryReportCsv()).rejects.toThrow(/Forbidden/);
      } finally {
        mockCurrentUser.role = prevRole;
      }
    });
  });
});
