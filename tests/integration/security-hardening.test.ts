import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/db';
import { warehouses, categories, products, inventoryBalances, auditLogs, users } from '@/db/schema';
import { getAuditLogs, exportInventoryReportCsv } from '@/server/reporting';
import { requireAuth, requirePermission } from '@/server/auth';
import { PERMISSIONS, UserRole, hasPermission } from '@/lib/permissions';
import { eq, inArray } from 'drizzle-orm';

const mockUser: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
} = {
  id: '7b7d58da-d45a-411d-bd0e-c42f65521482',
  email: 'admin@rims.local',
  name: 'System Administrator',
  role: 'ADMIN',
  isActive: true,
};

vi.mock('@/server/auth', async () => {
  return {
    getCurrentUser: vi.fn(async () => (mockUser.isActive ? mockUser : null)),
    requireAuth: vi.fn(async () => {
      if (!mockUser.isActive) {
        throw new Error('ACCOUNT_DEACTIVATED');
      }
      return mockUser;
    }),
    requirePermission: vi.fn(async (permission: string) => {
      if (!mockUser.isActive) {
        throw new Error('ACCOUNT_DEACTIVATED');
      }
      if (!hasPermission(mockUser.role, permission as any)) {
        throw new Error(`FORBIDDEN: missing permission ${permission}`);
      }
      return mockUser;
    }),
  };
});

describe('RIMS Phase 11: Security Audit & Hardening Regression Tests', () => {
  let warehouseId: string;
  let categoryId: string;
  let productId: string;
  const ts = Date.now();

  beforeAll(async () => {
    // 1. Create a facility
    const [wh] = await db
      .insert(warehouses)
      .values({
        code: `WH-SEC-${ts}`,
        name: `Security Audit WH ${ts}`,
        isActive: true,
      })
      .returning();
    warehouseId = wh.id;

    // 2. Create a category
    const [cat] = await db
      .insert(categories)
      .values({
        code: `CAT-SEC-${ts}`,
        name: `Security Category ${ts}`,
      })
      .returning();
    categoryId = cat.id;

    // 3. Create a product with potential injection strings
    const [prod] = await db
      .insert(products)
      .values({
        sku: `SKU-SEC-${ts}`,
        name: ` \t=CMD|' /C calc'!A0 ${ts}`, // Starts with whitespace + formula chars
        categoryId,
        uom: 'EACH',
        costPrice: '10.0000',
        sellingPrice: '20.0000',
        reorderPoint: '5.00',
        isArchived: false,
      })
      .returning();
    productId = prod.id;

    // 4. Create inventory balance
    await db.insert(inventoryBalances).values({
      warehouseId,
      productId,
      onHandQty: '100.00',
      reservedQty: '10.00',
      quarantinedQty: '5.00',
    });

    // 5. Insert audit log with nested sensitive secrets
    await db.insert(auditLogs).values({
      actorId: mockUser.id,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'INVENTORY',
      entityId: productId,
      newValues: {
        adjustedQty: 100,
        securityDetails: {
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$secretHash',
          secret: 'super-secret-key-123',
          apiToken: 'token_abc123',
          nestedConfig: {
            refreshToken: 'jwt_refresh_xyz',
            safeField: 'audit_metric_value',
          },
        },
      },
      ipAddress: '127.0.0.1',
    });
  });

  afterAll(async () => {
    if (productId) {
      await db.delete(auditLogs).where(eq(auditLogs.entityId, productId));
      await db.delete(inventoryBalances).where(eq(inventoryBalances.productId, productId));
      await db.delete(products).where(eq(products.id, productId));
    }
    if (categoryId) {
      await db.delete(categories).where(eq(categories.id, categoryId));
    }
    if (warehouseId) {
      await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    }
  });

  describe('1. Role Authorization Matrix (Least Privilege & Deny-by-Default)', () => {
    const roles: UserRole[] = [
      'ADMIN',
      'INVENTORY_MANAGER',
      'WAREHOUSE_STAFF',
      'SALES_REP',
      'AUDITOR',
    ];

    it('denies audit review access to WAREHOUSE_STAFF and SALES_REP', async () => {
      for (const role of ['WAREHOUSE_STAFF', 'SALES_REP'] as UserRole[]) {
        mockUser.role = role;
        mockUser.isActive = true;
        await expect(getAuditLogs()).rejects.toThrow(/FORBIDDEN/);
      }
    });

    it('grants audit review access exclusively to ADMIN, INVENTORY_MANAGER, and AUDITOR', async () => {
      for (const role of ['ADMIN', 'INVENTORY_MANAGER', 'AUDITOR'] as UserRole[]) {
        mockUser.role = role;
        mockUser.isActive = true;
        const result = await getAuditLogs({ entityId: productId });
        expect(result).toHaveProperty('items');
        expect(result.items.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('denies CSV export to roles without REPORTS_EXPORT (WAREHOUSE_STAFF, SALES_REP)', async () => {
      for (const role of ['WAREHOUSE_STAFF', 'SALES_REP'] as UserRole[]) {
        mockUser.role = role;
        mockUser.isActive = true;
        await expect(exportInventoryReportCsv({ warehouseId })).rejects.toThrow(/FORBIDDEN/);
      }
    });

    it('permits CSV export to authorized roles (ADMIN, INVENTORY_MANAGER, AUDITOR)', async () => {
      for (const role of ['ADMIN', 'INVENTORY_MANAGER', 'AUDITOR'] as UserRole[]) {
        mockUser.role = role;
        mockUser.isActive = true;
        const csv = await exportInventoryReportCsv({ warehouseId });
        expect(csv).toContain('SKU,Product Name,Category,UOM');
      }
    });
  });

  describe('2. Inactive User Session & Guard Enforcement', () => {
    it('immediately rejects any protected operation when account is inactive', async () => {
      mockUser.role = 'ADMIN';
      mockUser.isActive = false; // Deactivated user account

      await expect(getAuditLogs()).rejects.toThrow(/ACCOUNT_DEACTIVATED/);
      await expect(exportInventoryReportCsv({ warehouseId })).rejects.toThrow(
        /ACCOUNT_DEACTIVATED/
      );
    });
  });

  describe('3. CSV Formula Injection Hardening', () => {
    it('escapes leading formula characters even with leading whitespace or tabs', async () => {
      mockUser.role = 'ADMIN';
      mockUser.isActive = true;

      const csv = await exportInventoryReportCsv({ warehouseId });
      // The product name starts with space and tab followed by '='.
      // Must be prefixed with single quote (') to neutralize execution in Excel/Calc.
      expect(csv).toContain("\"' \t=CMD|' /C calc'!A0");
    });
  });

  describe('4. Recursive Sensitive Data Redaction in Audit Logs', () => {
    it('recursively redacts passwordHash, secrets, and tokens from nested audit payloads', async () => {
      mockUser.role = 'AUDITOR';
      mockUser.isActive = true;

      const result = await getAuditLogs({ entityId: productId });
      expect(result.items.length).toBeGreaterThanOrEqual(1);

      const record = result.items.find((r) => r.entityId === productId);
      expect(record).toBeDefined();

      const newVals = record?.newValues as any;
      expect(newVals).toBeDefined();
      expect(newVals.adjustedQty).toBe(100);

      // Verify nested sensitive fields are redacted
      expect(newVals.securityDetails.passwordHash).toBe('[REDACTED]');
      expect(newVals.securityDetails.secret).toBe('[REDACTED]');
      expect(newVals.securityDetails.apiToken).toBe('[REDACTED]');
      expect(newVals.securityDetails.nestedConfig.refreshToken).toBe('[REDACTED]');
      expect(newVals.securityDetails.nestedConfig.safeField).toBe('audit_metric_value');
    });
  });

  describe('5. Inventory Invariant & Availability Integrity', () => {
    it('verifies generated available_qty accurately reflects on_hand - reserved - quarantined', async () => {
      const [balance] = await db
        .select()
        .from(inventoryBalances)
        .where(eq(inventoryBalances.productId, productId));

      expect(balance).toBeDefined();
      expect(parseFloat(balance.onHandQty)).toBe(100.0);
      expect(parseFloat(balance.reservedQty)).toBe(10.0);
      expect(parseFloat(balance.quarantinedQty)).toBe(5.0);
      // available_qty = 100 - 10 - 5 = 85.00
      expect(parseFloat(balance.availableQty)).toBe(85.0);
    });
  });
});
