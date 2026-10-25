import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  PERMISSIONS,
  type UserRole,
} from '@/lib/permissions';

describe('RIMS RBAC Permissions Matrix Unit Tests', () => {
  it('grants full operational and administrative permissions to ADMIN role', () => {
    const adminRole: UserRole = 'ADMIN';
    expect(hasPermission(adminRole, PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPermission(adminRole, PERMISSIONS.ROLES_ASSIGN)).toBe(true);
    expect(hasPermission(adminRole, PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(hasPermission(adminRole, PERMISSIONS.CATALOG_MANAGE)).toBe(true);
    expect(hasPermission(adminRole, PERMISSIONS.ORDERS_FULFILL)).toBe(true);
  });

  it('restricts user management and role assignment from non-ADMIN roles', () => {
    const nonAdminRoles: UserRole[] = [
      'INVENTORY_MANAGER',
      'WAREHOUSE_STAFF',
      'SALES_REP',
      'AUDITOR',
    ];

    for (const role of nonAdminRoles) {
      expect(hasPermission(role, PERMISSIONS.USERS_MANAGE)).toBe(false);
      expect(hasPermission(role, PERMISSIONS.ROLES_ASSIGN)).toBe(false);
    }
  });

  it('allows INVENTORY_MANAGER to approve adjustments and purchase orders but denies SALES_REP', () => {
    expect(hasPermission('INVENTORY_MANAGER', PERMISSIONS.INVENTORY_ADJUST_APPROVE)).toBe(true);
    expect(hasPermission('INVENTORY_MANAGER', PERMISSIONS.PURCHASING_ORDER_APPROVE)).toBe(true);

    expect(hasPermission('SALES_REP', PERMISSIONS.INVENTORY_ADJUST_APPROVE)).toBe(false);
    expect(hasPermission('SALES_REP', PERMISSIONS.PURCHASING_ORDER_APPROVE)).toBe(false);
  });

  it('allows SALES_REP to create sales orders but restricts fulfillment actions', () => {
    expect(hasPermission('SALES_REP', PERMISSIONS.ORDERS_CREATE)).toBe(true);
    expect(hasPermission('SALES_REP', PERMISSIONS.ORDERS_CANCEL)).toBe(true);
    expect(hasPermission('SALES_REP', PERMISSIONS.ORDERS_FULFILL)).toBe(false);
  });

  it('allows WAREHOUSE_STAFF to fulfill orders and receive goods but denies sales order creation', () => {
    expect(hasPermission('WAREHOUSE_STAFF', PERMISSIONS.ORDERS_FULFILL)).toBe(true);
    expect(hasPermission('WAREHOUSE_STAFF', PERMISSIONS.PURCHASING_RECEIVE)).toBe(true);
    expect(hasPermission('WAREHOUSE_STAFF', PERMISSIONS.ORDERS_CREATE)).toBe(false);
  });

  it('provides read-only audit and report access to AUDITOR role without mutation permissions', () => {
    expect(hasPermission('AUDITOR', PERMISSIONS.AUDIT_READ)).toBe(true);
    expect(hasPermission('AUDITOR', PERMISSIONS.REPORTS_READ)).toBe(true);
    expect(hasPermission('AUDITOR', PERMISSIONS.REPORTS_EXPORT)).toBe(true);

    expect(hasPermission('AUDITOR', PERMISSIONS.CATALOG_MANAGE)).toBe(false);
    expect(hasPermission('AUDITOR', PERMISSIONS.ORDERS_CREATE)).toBe(false);
    expect(hasPermission('AUDITOR', PERMISSIONS.INVENTORY_ADJUST_CREATE)).toBe(false);
  });

  it('enforces deny-by-default for null, undefined, or empty role inputs', () => {
    expect(hasPermission(null, PERMISSIONS.CATALOG_READ)).toBe(false);
    expect(hasPermission(undefined, PERMISSIONS.CATALOG_READ)).toBe(false);
    expect(hasPermission('' as UserRole, PERMISSIONS.CATALOG_READ)).toBe(false);
  });

  it('validates hasAllPermissions and hasAnyPermission compound checks', () => {
    const managerRole: UserRole = 'INVENTORY_MANAGER';
    expect(
      hasAllPermissions(managerRole, [
        PERMISSIONS.CATALOG_READ,
        PERMISSIONS.INVENTORY_READ,
        PERMISSIONS.REPORTS_READ,
      ])
    ).toBe(true);

    expect(
      hasAllPermissions(managerRole, [
        PERMISSIONS.CATALOG_READ,
        PERMISSIONS.USERS_MANAGE, // Missing for manager
      ])
    ).toBe(false);

    expect(
      hasAnyPermission(managerRole, [PERMISSIONS.USERS_MANAGE, PERMISSIONS.CATALOG_READ])
    ).toBe(true);
  });
});
