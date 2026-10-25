// Centralized RIMS Permission Keys Catalog
export const PERMISSIONS = {
  // Product Catalog & Categories
  CATALOG_READ: 'catalog:read',
  CATALOG_MANAGE: 'catalog:manage',

  // Warehouse Infrastructure
  WAREHOUSE_READ: 'warehouse:read',
  WAREHOUSE_MANAGE: 'warehouse:manage',

  // Inventory Overview & Live Balances
  INVENTORY_READ: 'inventory:read',

  // Stock Adjustments & Cycle Counts
  INVENTORY_ADJUST_CREATE: 'inventory:adjust:create',
  INVENTORY_ADJUST_APPROVE: 'inventory:adjust:approve',

  // Warehouse Transfers
  INVENTORY_TRANSFER_DISPATCH: 'inventory:transfer:dispatch',
  INVENTORY_TRANSFER_RECEIVE: 'inventory:transfer:receive',
  INVENTORY_TRANSFER_MANAGE: 'inventory:transfer:manage',

  // Sales Orders & Reservations
  ORDERS_READ: 'orders:read',
  ORDERS_CREATE: 'orders:create',
  ORDERS_FULFILL: 'orders:fulfill',
  ORDERS_CANCEL: 'orders:cancel',

  // Purchasing & Suppliers
  PURCHASING_READ: 'purchasing:read',
  PURCHASING_ORDER_CREATE: 'purchasing:order:create',
  PURCHASING_ORDER_APPROVE: 'purchasing:order:approve',
  PURCHASING_RECEIVE: 'purchasing:receive',
  SUPPLIERS_MANAGE: 'suppliers:manage',

  // Reports & Analytics
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',

  // User & Access Administration
  USERS_MANAGE: 'users:manage',
  ROLES_ASSIGN: 'roles:assign',

  // Audit Logs
  AUDIT_READ: 'audit:read',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type UserRole = 'ADMIN' | 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF' | 'SALES_REP' | 'AUDITOR';

/**
 * RIMS Role-to-Permissions Mapping Matrix
 * Strict Least-Privilege & Deny-by-Default
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  ADMIN: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.WAREHOUSE_READ,
    PERMISSIONS.WAREHOUSE_MANAGE,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST_CREATE,
    PERMISSIONS.INVENTORY_ADJUST_APPROVE,
    PERMISSIONS.INVENTORY_TRANSFER_DISPATCH,
    PERMISSIONS.INVENTORY_TRANSFER_RECEIVE,
    PERMISSIONS.INVENTORY_TRANSFER_MANAGE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_FULFILL,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.PURCHASING_READ,
    PERMISSIONS.PURCHASING_ORDER_CREATE,
    PERMISSIONS.PURCHASING_ORDER_APPROVE,
    PERMISSIONS.PURCHASING_RECEIVE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.ROLES_ASSIGN,
    PERMISSIONS.AUDIT_READ,
  ],

  INVENTORY_MANAGER: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.WAREHOUSE_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST_CREATE,
    PERMISSIONS.INVENTORY_ADJUST_APPROVE,
    PERMISSIONS.INVENTORY_TRANSFER_DISPATCH,
    PERMISSIONS.INVENTORY_TRANSFER_RECEIVE,
    PERMISSIONS.INVENTORY_TRANSFER_MANAGE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_FULFILL,
    PERMISSIONS.PURCHASING_READ,
    PERMISSIONS.PURCHASING_ORDER_CREATE,
    PERMISSIONS.PURCHASING_ORDER_APPROVE,
    PERMISSIONS.PURCHASING_RECEIVE,
    PERMISSIONS.SUPPLIERS_MANAGE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.AUDIT_READ,
  ],

  WAREHOUSE_STAFF: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.WAREHOUSE_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.INVENTORY_ADJUST_CREATE,
    PERMISSIONS.INVENTORY_TRANSFER_DISPATCH,
    PERMISSIONS.INVENTORY_TRANSFER_RECEIVE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_FULFILL,
    PERMISSIONS.PURCHASING_READ,
    PERMISSIONS.PURCHASING_RECEIVE,
  ],

  SALES_REP: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.WAREHOUSE_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.REPORTS_READ,
  ],

  AUDITOR: [
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.WAREHOUSE_READ,
    PERMISSIONS.INVENTORY_READ,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.PURCHASING_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.AUDIT_READ,
  ],
};

/**
 * Checks whether a given role has a specific permission.
 * Denies access by default if permission is not explicitly listed.
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Checks whether a given role has all requested permissions.
 */
export function hasAllPermissions(
  role: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  if (!role || permissions.length === 0) return false;
  return permissions.every((perm) => hasPermission(role, perm));
}

/**
 * Checks whether a given role has at least one of the requested permissions.
 */
export function hasAnyPermission(
  role: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  if (!role || permissions.length === 0) return false;
  return permissions.some((perm) => hasPermission(role, perm));
}
