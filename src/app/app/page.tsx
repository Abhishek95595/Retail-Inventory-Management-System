import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/server/auth';
import { ROLE_PERMISSIONS, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import { getDashboardMetrics } from '@/server/reporting';
import Link from 'next/link';
import {
  Boxes,
  AlertTriangle,
  PackageX,
  DollarSign,
  Package,
  TrendingUp,
  History,
  Shield,
  Key,
} from 'lucide-react';

export default async function AppDashboardPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  const canReadReports = hasPermission(user.role, PERMISSIONS.REPORTS_READ);

  let metrics = null;
  if (canReadReports) {
    try {
      metrics = await getDashboardMetrics();
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 pb-12">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Identity & Welcome Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-2">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Session Authenticated</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Welcome, {user.name}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Operational Dashboard • Facility Access: Multi-Warehouse Operations ({user.email})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  Role: {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Metric Load Failure Alert */}
          {canReadReports && !metrics && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold">Unable to load aggregated operational metrics.</p>
                <p className="mt-0.5 text-rose-700">
                  Please verify database connectivity and reporting service permissions.
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards Row */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Products
                  </span>
                  <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                    <Boxes className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {metrics.counts.activeProducts}
                </div>
                <p className="text-[11px] text-slate-500">
                  Across {metrics.counts.activeWarehouses} active facilities
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Inventory Valuation
                  </span>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  ${metrics.inventory.totalValuation}
                </div>
                <p className="text-[11px] text-slate-500">
                  {metrics.inventory.totalOnHandQty} total physical units on hand
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Low Stock Alerts
                  </span>
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-600 font-mono">
                  {metrics.counts.lowStockProducts}
                </div>
                <p className="text-[11px] text-slate-500">At or below configured reorder point</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Stockout Zero Stock
                  </span>
                  <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
                    <PackageX className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-rose-600 font-mono">
                  {metrics.counts.outOfStockProducts}
                </div>
                <p className="text-[11px] text-slate-500">Zero available stock for fulfillment</p>
              </div>
            </div>
          )}

          {/* Inventory Balance Breakdown & Lifecycle Pipelines */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inventory Accounting Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Inventory Ledger Quantities
                  </h2>
                  <Link
                    href="/inventory"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    View All →
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <span className="text-slate-600 font-medium">On-Hand Physical Units:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {metrics.inventory.totalOnHandQty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 text-amber-900">
                    <span className="font-medium">Committed Stock Reservations:</span>
                    <span className="font-bold font-mono">
                      {metrics.inventory.totalReservedQty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 text-emerald-900">
                    <span className="font-bold">Net Available for Fulfillment:</span>
                    <span className="font-bold font-mono text-sm">
                      {metrics.inventory.totalAvailableQty}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Invariant enforced by PostgreSQL stored column: Available = On-Hand - Reserved -
                  Quarantined.
                </p>
              </div>

              {/* Sales Order Pipeline Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Sales Orders Pipeline</h2>
                  <Link
                    href="/orders"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    View Orders →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Draft
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {metrics.salesOrders.DRAFT || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50">
                    <span className="text-[10px] uppercase font-semibold text-indigo-700 block">
                      Confirmed
                    </span>
                    <span className="text-lg font-black text-indigo-900 font-mono">
                      {metrics.salesOrders.CONFIRMED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-amber-100 bg-amber-50/50">
                    <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                      Picking/Packed
                    </span>
                    <span className="text-lg font-black text-amber-900 font-mono">
                      {(metrics.salesOrders.PICKING || 0) + (metrics.salesOrders.PACKED || 0)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/50">
                    <span className="text-[10px] uppercase font-semibold text-blue-700 block">
                      Dispatched
                    </span>
                    <span className="text-lg font-black text-blue-900 font-mono">
                      {metrics.salesOrders.DISPATCHED || 0}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Delivered Orders:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {metrics.salesOrders.DELIVERED || 0}
                  </span>
                </div>
              </div>

              {/* Purchase Order Pipeline Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Purchasing Pipeline</h2>
                  <Link
                    href="/purchasing"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    View POs →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Submitted
                    </span>
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {metrics.purchaseOrders.SUBMITTED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/50">
                    <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
                      Approved
                    </span>
                    <span className="text-lg font-black text-emerald-900 font-mono">
                      {metrics.purchaseOrders.APPROVED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-amber-100 bg-amber-50/50">
                    <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                      Partial Rec.
                    </span>
                    <span className="text-lg font-black text-amber-900 font-mono">
                      {metrics.purchaseOrders.PARTIALLY_RECEIVED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/50">
                    <span className="text-[10px] uppercase font-semibold text-blue-700 block">
                      Received
                    </span>
                    <span className="text-lg font-black text-blue-900 font-mono">
                      {metrics.purchaseOrders.RECEIVED || 0}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Draft POs in Authoring:</span>
                  <span className="font-bold text-slate-700 font-mono">
                    {metrics.purchaseOrders.DRAFT || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Operations Activity Row */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Stock Movements */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Recent Stock Movements</h2>
                  <Link
                    href="/inventory/movements"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    View All →
                  </Link>
                </div>

                {metrics.recentMovements.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No recent inventory movements recorded.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {metrics.recentMovements.map((mov) => (
                      <div
                        key={mov.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {mov.productName}{' '}
                            <span className="text-slate-400 font-mono">({mov.sku})</span>
                          </p>
                          <p className="text-slate-500 text-[11px]">
                            {mov.warehouseName} • {new Date(mov.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              mov.movementType.includes('IN') || mov.movementType === 'RECEIPT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {mov.movementType}
                          </span>
                          <span className="block font-mono font-bold text-slate-900 mt-0.5">
                            {mov.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Deliveries Accepted */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Recent Supplier Receipts</h2>
                  <Link
                    href="/purchasing/receipts"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    View History →
                  </Link>
                </div>

                {metrics.recentReceipts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No supplier goods receipts recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {metrics.recentReceipts.map((rc) => (
                      <div key={rc.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <Link
                            href={`/purchasing/receipts/${rc.id}`}
                            className="font-bold text-slate-900 hover:text-emerald-600 transition font-mono"
                          >
                            {rc.receiptNumber}
                          </Link>
                          <p className="text-slate-500 text-[11px]">
                            Against {rc.poNumber} • {rc.warehouseName}
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          {new Date(rc.receivedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Multi-Warehouse Operational Summaries */}
          {metrics && metrics.warehouseSummaries && metrics.warehouseSummaries.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Inventory Summaries by Warehouse
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live valuation and stock availability across active logistics facilities
                  </p>
                </div>
                <Link
                  href="/warehouses"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Manage Warehouses →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Warehouse Facility</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3 text-right">Active SKUs</th>
                      <th className="py-2.5 px-3 text-right">Physical On-Hand</th>
                      <th className="py-2.5 px-3 text-right">Net Available</th>
                      <th className="py-2.5 px-3 text-right">Stock Valuation</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.warehouseSummaries.map((wh) => (
                      <tr key={wh.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <Link
                            href={`/warehouses/${wh.id}`}
                            className="hover:text-emerald-600 transition"
                          >
                            {wh.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{wh.code}</td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                          {wh.productCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                          {wh.onHandQty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          {wh.availableQty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          ${wh.valuation}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/inventory?warehouseId=${wh.id}`}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 underline"
                          >
                            View Stock
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Actions & Navigation Cards */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Reporting & Operations Shortcuts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/reports"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition">
                    Inventory Valuation
                  </p>
                  <p className="text-[11px] text-slate-500">Facility & category reports</p>
                </div>
              </Link>

              <Link
                href="/reports?lowStockOnly=true"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition">
                    Low Stock Report
                  </p>
                  <p className="text-[11px] text-slate-500">Items at or below reorder</p>
                </div>
              </Link>

              <Link
                href="/audit-logs"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    Audit Review
                  </p>
                  <p className="text-[11px] text-slate-500">Immutable system logs</p>
                </div>
              </Link>

              <Link
                href="/inventory/movements"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">
                    Movement Ledger
                  </p>
                  <p className="text-[11px] text-slate-500">Append-only stock ledger</p>
                </div>
              </Link>
            </div>
          </div>

          {/* RBAC Permissions Grid */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Key className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Active Role Permissions ({permissions.length} granted)
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {permissions.map((perm) => (
                <div
                  key={perm}
                  className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-600 truncate"
                >
                  {perm}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
