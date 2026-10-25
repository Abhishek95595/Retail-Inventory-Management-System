import { pgEnum } from 'drizzle-orm/pg-core';

// User & Access Roles
export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'INVENTORY_MANAGER',
  'WAREHOUSE_STAFF',
  'SALES_REP',
  'AUDITOR',
]);

// Inventory Movement Types
export const movementTypeEnum = pgEnum('movement_type', [
  'RECEIPT',
  'DISPATCH',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'QUARANTINE_HOLD',
  'QUARANTINE_RELEASE',
]);

// Sales Order Status Lifecycle
export const orderStatusEnum = pgEnum('order_status', [
  'DRAFT',
  'CONFIRMED',
  'PICKING',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
]);

// Purchase Order Status Lifecycle
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CANCELLED',
]);

// Stock Transfer Status Lifecycle
export const transferStatusEnum = pgEnum('transfer_status', [
  'DRAFT',
  'DISPATCHED',
  'RECEIVED',
  'CANCELLED',
]);

// Stock Reservation Status
export const reservationStatusEnum = pgEnum('reservation_status', [
  'ACTIVE',
  'FULFILLED',
  'RELEASED',
]);
