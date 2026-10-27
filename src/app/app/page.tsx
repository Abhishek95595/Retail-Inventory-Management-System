import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/server/auth';
import { ROLE_PERMISSIONS, hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { getDashboardMetrics } from '@/server/reporting';
import Link from 'next/link';
import {
  Boxes,
  AlertTriangle,
  PackageX,
  IndianRupee,
  Package,
  TrendingUp,
  History,
  Shield,
  Key,
} from 'lucide-react';
import { formatINR } from '@/lib/currency';

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
    <div className="flex min-h-screen flex-col bg-[#171717] text-neutral-100 pb-12">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Identity & Welcome Card */}
          <div className="rounded-2xl border border-[#262626] bg-[#1a1a1a] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 rounded-full bg-[#06110C] px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-[#1b3327] mb-2">
                  <Shield className="h-3.5 w-3.5 text-[#A31C1B]" />
                  <span>Session Authenticated</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Welcome, {user.name}
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Operational Dashboard • Facility Access: Multi-Warehouse Operations ({user.email})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-[#A31C1B] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-white/10">
                  Role: {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Metric Load Failure Alert */}
          {canReadReports && !metrics && (
            <div className="rounded-xl border border-rose-900/50 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-[#A31C1B] shrink-0" />
              <div>
                <p className="font-bold">Unable to load aggregated operational metrics.</p>
                <p className="mt-0.5 text-rose-400">
                  Please verify database connectivity and reporting service permissions.
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards Row */}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Total Products
                  </span>
                  <div className="rounded-lg bg-[#06110C] border border-[#262626] p-2 text-neutral-200">
                    <Boxes className="h-5 w-5 text-[#A31C1B]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {metrics.counts.activeProducts}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Across {metrics.counts.activeWarehouses} active facilities
                </p>
              </div>

              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Inventory Valuation
                  </span>
                  <div className="rounded-lg bg-[#06110C] border border-[#1b3327] p-2 text-emerald-400">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {formatINR(metrics.inventory.totalValuation)}
                </div>
                <p className="text-[11px] text-neutral-400">
                  {metrics.inventory.totalOnHandQty} total physical units on hand
                </p>
              </div>

              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Low Stock Alerts
                  </span>
                  <div className="rounded-lg bg-amber-950/40 border border-amber-900/50 p-2 text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  {metrics.counts.lowStockProducts}
                </div>
                <p className="text-[11px] text-neutral-400">At or below configured reorder point</p>
              </div>

              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Stockout Zero Stock
                  </span>
                  <div className="rounded-lg bg-[#A31C1B]/20 border border-[#A31C1B]/40 p-2 text-[#A31C1B]">
                    <PackageX className="h-5 w-5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#f05252] font-mono">
                  {metrics.counts.outOfStockProducts}
                </div>
                <p className="text-[11px] text-neutral-400">Zero available stock for fulfillment</p>
              </div>
            </div>
          )}

          {/* Inventory Balance Breakdown & Lifecycle Pipelines */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inventory Accounting Breakdown */}
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm space-y-4">
                <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Inventory Ledger Quantities</h2>
                  <Link
                    href="/inventory"
                    className="text-xs font-semibold text-neutral-300 hover:text-[#A31C1B] transition"
                  >
                    View All →
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#06110C] border border-[#262626]">
                    <span className="text-neutral-300 font-medium">On-Hand Physical Units:</span>
                    <span className="font-bold text-white font-mono">
                      {metrics.inventory.totalOnHandQty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#06110C] border border-amber-900/30 text-amber-300">
                    <span className="font-medium">Committed Stock Reservations:</span>
                    <span className="font-bold font-mono">
                      {metrics.inventory.totalReservedQty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#06110C] border border-emerald-900/30 text-emerald-400">
                    <span className="font-bold">Net Available for Fulfillment:</span>
                    <span className="font-bold font-mono text-sm">
                      {metrics.inventory.totalAvailableQty}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400">
                  Invariant enforced by PostgreSQL stored column: Available = On-Hand - Reserved -
                  Quarantined.
                </p>
              </div>

              {/* Sales Order Pipeline Breakdown */}
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm space-y-4">
                <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Sales Orders Pipeline</h2>
                  <Link
                    href="/orders"
                    className="text-xs font-semibold text-neutral-300 hover:text-[#A31C1B] transition"
                  >
                    View Orders →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                      Draft
                    </span>
                    <span className="text-lg font-black text-white font-mono">
                      {metrics.salesOrders.DRAFT || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-indigo-400 block">
                      Confirmed
                    </span>
                    <span className="text-lg font-black text-indigo-200 font-mono">
                      {metrics.salesOrders.CONFIRMED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-amber-400 block">
                      Picking/Packed
                    </span>
                    <span className="text-lg font-black text-amber-200 font-mono">
                      {(metrics.salesOrders.PICKING || 0) + (metrics.salesOrders.PACKED || 0)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-sky-400 block">
                      Dispatched
                    </span>
                    <span className="text-lg font-black text-sky-200 font-mono">
                      {metrics.salesOrders.DISPATCHED || 0}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#262626]">
                  <span className="text-neutral-400">Delivered Orders:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {metrics.salesOrders.DELIVERED || 0}
                  </span>
                </div>
              </div>

              {/* Purchase Order Pipeline Breakdown */}
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm space-y-4">
                <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Purchasing Pipeline</h2>
                  <Link
                    href="/purchasing"
                    className="text-xs font-semibold text-neutral-300 hover:text-[#A31C1B] transition"
                  >
                    View POs →
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                      Submitted
                    </span>
                    <span className="text-lg font-black text-white font-mono">
                      {metrics.purchaseOrders.SUBMITTED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 block">
                      Approved
                    </span>
                    <span className="text-lg font-black text-emerald-300 font-mono">
                      {metrics.purchaseOrders.APPROVED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-amber-400 block">
                      Partial Rec.
                    </span>
                    <span className="text-lg font-black text-amber-300 font-mono">
                      {metrics.purchaseOrders.PARTIALLY_RECEIVED || 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-[#262626] bg-[#06110C]">
                    <span className="text-[10px] uppercase font-semibold text-sky-400 block">
                      Received
                    </span>
                    <span className="text-lg font-black text-sky-300 font-mono">
                      {metrics.purchaseOrders.RECEIVED || 0}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-[#262626]">
                  <span className="text-neutral-400">Draft POs in Authoring:</span>
                  <span className="font-bold text-neutral-200 font-mono">
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
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm space-y-4">
                <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Recent Stock Movements</h2>
                  <Link
                    href="/inventory/movements"
                    className="text-xs font-semibold text-neutral-300 hover:text-[#A31C1B] transition"
                  >
                    View All →
                  </Link>
                </div>

                {metrics.recentMovements.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">
                    No recent inventory movements recorded.
                  </p>
                ) : (
                  <div className="divide-y divide-[#262626]">
                    {metrics.recentMovements.map((mov) => (
                      <div
                        key={mov.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {mov.productName}{' '}
                            <span className="text-neutral-400 font-mono">({mov.sku})</span>
                          </p>
                          <p className="text-neutral-400 text-[11px]">
                            {mov.warehouseName} • {new Date(mov.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                              mov.movementType.includes('IN') || mov.movementType === 'RECEIPT'
                                ? 'bg-[#06110C] border-emerald-800 text-emerald-400'
                                : 'bg-[#171717] border-[#333333] text-neutral-300'
                            }`}
                          >
                            {mov.movementType}
                          </span>
                          <span className="block font-mono font-bold text-white mt-0.5">
                            {mov.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Deliveries Accepted */}
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm space-y-4">
                <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white">Recent Supplier Receipts</h2>
                  <Link
                    href="/purchasing/receipts"
                    className="text-xs font-semibold text-neutral-300 hover:text-[#A31C1B] transition"
                  >
                    View History →
                  </Link>
                </div>

                {metrics.recentReceipts.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-4 text-center">
                    No supplier goods receipts recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#262626]">
                    {metrics.recentReceipts.map((rc) => (
                      <div key={rc.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <Link
                            href={`/purchasing/receipts/${rc.id}`}
                            className="font-bold text-white hover:text-[#A31C1B] transition font-mono"
                          >
                            {rc.receiptNumber}
                          </Link>
                          <p className="text-neutral-400 text-[11px]">
                            Against {rc.poNumber} • {rc.warehouseName}
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-neutral-400">
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
            <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm space-y-4">
              <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Inventory Summaries by Warehouse
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Live valuation and stock availability across active logistics facilities
                  </p>
                </div>
                <Link
                  href="/warehouses"
                  className="text-xs font-semibold text-neutral-300 hover:text-[#A31C1B] transition"
                >
                  Manage Warehouses →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#06110C] text-[11px] font-semibold uppercase tracking-wider text-neutral-300 border-b border-[#262626]">
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
                  <tbody className="divide-y divide-[#262626]">
                    {metrics.warehouseSummaries.map((wh) => (
                      <tr key={wh.id} className="hover:bg-[#222222] transition">
                        <td className="py-3 px-3 font-semibold text-white">
                          <Link
                            href={`/warehouses/${wh.id}`}
                            className="hover:text-[#A31C1B] transition"
                          >
                            {wh.name}
                          </Link>
                        </td>
                        <td className="py-3 px-3 font-mono text-neutral-400">{wh.code}</td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-neutral-200">
                          {wh.productCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-white">
                          {wh.onHandQty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          {wh.availableQty}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {formatINR(wh.valuation)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/inventory?warehouseId=${wh.id}`}
                            className="text-[11px] font-semibold text-[#A31C1B] hover:text-red-400 transition"
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
          <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-white border-b border-[#262626] pb-3">
              Reporting & Operations Shortcuts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/reports"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#06110C] hover:border-[#A31C1B] transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-[#A31C1B]/20 border border-[#A31C1B]/30 text-[#A31C1B] flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-[#A31C1B] transition">
                    Inventory Valuation
                  </p>
                  <p className="text-[11px] text-neutral-400">Facility & category reports</p>
                </div>
              </Link>

              <Link
                href="/reports?lowStockOnly=true"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#06110C] hover:border-[#A31C1B] transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-amber-950/40 border border-amber-900/40 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                    Low Stock Report
                  </p>
                  <p className="text-[11px] text-neutral-400">Items at or below reorder</p>
                </div>
              </Link>

              <Link
                href="/audit-logs"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#06110C] hover:border-[#A31C1B] transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-950/40 border border-indigo-900/40 text-indigo-400 flex items-center justify-center shrink-0">
                  <History className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition">
                    Audit Review
                  </p>
                  <p className="text-[11px] text-neutral-400">Immutable system logs</p>
                </div>
              </Link>

              <Link
                href="/inventory/movements"
                className="flex items-center space-x-3 p-3.5 rounded-lg border border-[#262626] bg-[#06110C] hover:border-[#A31C1B] transition group"
              >
                <div className="h-8 w-8 rounded-lg bg-[#222222] border border-[#333333] text-neutral-300 flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-neutral-200 transition">
                    Movement Ledger
                  </p>
                  <p className="text-[11px] text-neutral-400">Append-only stock ledger</p>
                </div>
              </Link>
            </div>
          </div>

          {/* RBAC Permissions Grid */}
          <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <Key className="h-4 w-4 text-[#A31C1B]" />
              <h2 className="text-sm font-bold text-white">
                Active Role Permissions ({permissions.length} granted)
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {permissions.map((perm) => (
                <div
                  key={perm}
                  className="rounded border border-[#262626] bg-[#06110C] px-2.5 py-1 text-[11px] font-mono text-neutral-300 truncate"
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
