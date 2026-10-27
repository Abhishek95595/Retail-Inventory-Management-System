import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getAuditLogs } from '@/server/reporting';
import { AppHeader } from '@/frontend/components/AppHeader';
import {
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Lock,
  Activity,
} from 'lucide-react';

interface AuditLogsPageProps {
  searchParams: {
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: string;
  };
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  if (!hasPermission(user.role, PERMISSIONS.AUDIT_READ)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AppHeader user={user} />
        <main className="max-w-4xl mx-auto py-16 px-4 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <Lock className="mx-auto h-10 w-10 text-red-600 mb-3" />
            <h1 className="text-xl font-bold text-red-900">
              Access Denied: Audit Review Restricted
            </h1>
            <p className="mt-2 text-sm text-red-700">
              Your role ({user.role}) is not authorized to inspect security and data-mutation audit
              trails. This interface is restricted to Auditor, Admin, and Inventory Management
              officers.
            </p>
            <div className="mt-6">
              <Link
                href="/app"
                className="inline-flex items-center rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const action = searchParams.action || '';
  const entityType = searchParams.entityType || '';
  const entityId = searchParams.entityId || '';
  const startDate = searchParams.startDate || '';
  const endDate = searchParams.endDate || '';
  const search = searchParams.search || '';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const result = await getAuditLogs({
    action: action || undefined,
    entityType: entityType || undefined,
    entityId: entityId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: search || undefined,
    page,
    limit: 25,
  });

  return (
    <div className="min-h-screen bg-[#171717] text-neutral-100 pb-16">
      <AppHeader user={user} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 rounded-full bg-[#06110C] px-2.5 py-0.5 text-xs font-semibold text-neutral-300 border border-[#262626] mb-2">
              <ShieldAlert className="h-3.5 w-3.5 text-[#A31C1B]" />
              <span>Immutable Ledger • Read-Only Review</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              System Audit Trail & Event Log
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Tamper-evident log of operational changes, inventory transfers, order reservations,
              and purchasing flows.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-lg bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-800/60">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Sensitive Data Redaction Active
            </span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-4 shadow-sm">
          <form method="GET" action="/audit-logs" className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search text */}
              <div>
                <label
                  htmlFor="search"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  Search Action / Entity ID
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    id="search"
                    name="search"
                    type="text"
                    defaultValue={search}
                    placeholder="Search keywords..."
                    className="w-full rounded-lg border border-[#333333] bg-[#141414] pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Filter */}
              <div>
                <label
                  htmlFor="action"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  Action Type
                </label>
                <select
                  id="action"
                  name="action"
                  defaultValue={action}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white focus:border-[#A31C1B] focus:outline-none"
                >
                  <option value="" className="bg-[#1a1a1a] text-white">
                    All Actions
                  </option>
                  <option value="LOGIN" className="bg-[#1a1a1a] text-white">
                    LOGIN
                  </option>
                  <option value="STOCK_RECEIPT" className="bg-[#1a1a1a] text-white">
                    STOCK_RECEIPT
                  </option>
                  <option value="STOCK_ISSUE" className="bg-[#1a1a1a] text-white">
                    STOCK_ISSUE
                  </option>
                  <option value="STOCK_ADJUSTMENT" className="bg-[#1a1a1a] text-white">
                    STOCK_ADJUSTMENT
                  </option>
                  <option value="TRANSFER_INITIATED" className="bg-[#1a1a1a] text-white">
                    TRANSFER_INITIATED
                  </option>
                  <option value="TRANSFER_DISPATCHED" className="bg-[#1a1a1a] text-white">
                    TRANSFER_DISPATCHED
                  </option>
                  <option value="TRANSFER_RECEIVED" className="bg-[#1a1a1a] text-white">
                    TRANSFER_RECEIVED
                  </option>
                  <option value="SALES_ORDER_CONFIRMED" className="bg-[#1a1a1a] text-white">
                    SALES_ORDER_CONFIRMED
                  </option>
                  <option value="SALES_ORDER_DISPATCHED" className="bg-[#1a1a1a] text-white">
                    SALES_ORDER_DISPATCHED
                  </option>
                  <option value="PURCHASE_ORDER_SUBMITTED" className="bg-[#1a1a1a] text-white">
                    PURCHASE_ORDER_SUBMITTED
                  </option>
                  <option value="PURCHASE_ORDER_APPROVED" className="bg-[#1a1a1a] text-white">
                    PURCHASE_ORDER_APPROVED
                  </option>
                  <option value="GOODS_RECEIPT_POSTED" className="bg-[#1a1a1a] text-white">
                    GOODS_RECEIPT_POSTED
                  </option>
                </select>
              </div>

              {/* Entity Type Filter */}
              <div>
                <label
                  htmlFor="entityType"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  Entity Category
                </label>
                <select
                  id="entityType"
                  name="entityType"
                  defaultValue={entityType}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white focus:border-[#A31C1B] focus:outline-none"
                >
                  <option value="" className="bg-[#1a1a1a] text-white">
                    All Entities
                  </option>
                  <option value="INVENTORY" className="bg-[#1a1a1a] text-white">
                    INVENTORY
                  </option>
                  <option value="TRANSFER" className="bg-[#1a1a1a] text-white">
                    TRANSFER
                  </option>
                  <option value="SALES_ORDER" className="bg-[#1a1a1a] text-white">
                    SALES_ORDER
                  </option>
                  <option value="PURCHASE_ORDER" className="bg-[#1a1a1a] text-white">
                    PURCHASE_ORDER
                  </option>
                  <option value="GOODS_RECEIPT" className="bg-[#1a1a1a] text-white">
                    GOODS_RECEIPT
                  </option>
                  <option value="PRODUCT" className="bg-[#1a1a1a] text-white">
                    PRODUCT
                  </option>
                  <option value="WAREHOUSE" className="bg-[#1a1a1a] text-white">
                    WAREHOUSE
                  </option>
                  <option value="USER" className="bg-[#1a1a1a] text-white">
                    USER
                  </option>
                </select>
              </div>

              {/* Date Start */}
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  From Date
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={startDate}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white focus:border-[#A31C1B] focus:outline-none"
                />
              </div>

              {/* Date End */}
              <div>
                <label
                  htmlFor="endDate"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  To Date
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={endDate}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white focus:border-[#A31C1B] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Link
                href="/audit-logs"
                className="inline-flex items-center rounded-lg border border-[#333333] bg-[#141414] hover:bg-[#222222] px-3 py-1.5 text-xs font-medium text-neutral-300"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset Filters
              </Link>
              <button
                type="submit"
                className="rounded-lg bg-[#A31C1B] hover:bg-[#8a1817] text-white px-4 py-1.5 text-xs font-semibold shadow-sm transition-all"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-[#06110C] border-b border-[#262626] text-neutral-300 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Timestamp (UTC)
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Actor / User
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Entity Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Entity ID
                  </th>
                  <th scope="col" className="px-4 py-3">
                    IP Address
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Audit Details / State Snapshot
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] bg-[#1a1a1a]">
                {result.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                      <Activity className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                      <p className="font-semibold text-neutral-300">No audit log records found</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Try clearing or expanding your date range and search criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  result.items.map((row) => (
                    <tr key={row.id} className="hover:bg-[#222222] transition-colors align-top">
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-neutral-400">
                        {new Date(row.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{row.actorName}</div>
                        {row.actorEmail && (
                          <div className="text-[10px] text-neutral-400">{row.actorEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-[#06110C] border border-[#262626] px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-200">
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-300">{row.entityType}</span>
                      </td>
                      <td
                        className="px-4 py-3 font-mono text-[11px] text-neutral-400 max-w-[150px] truncate"
                        title={row.entityId}
                      >
                        {row.entityId}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-neutral-400">
                        {row.ipAddress || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md space-y-1">
                          {row.newValues && Object.keys(row.newValues).length > 0 && (
                            <details className="text-[11px] bg-[#141414] rounded p-1.5 border border-[#262626]">
                              <summary className="cursor-pointer font-semibold text-neutral-300 hover:text-white">
                                View Snapshot Details ({Object.keys(row.newValues).length} keys)
                              </summary>
                              <pre className="mt-1 text-[10px] overflow-x-auto font-mono text-neutral-200 p-2 bg-[#0d0d0d] rounded border border-[#262626] max-h-36">
                                {JSON.stringify(row.newValues, null, 2)}
                              </pre>
                            </details>
                          )}
                          {!row.newValues && !row.oldValues && (
                            <span className="text-[11px] text-neutral-500 italic">
                              No state payload recorded
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#262626] bg-[#1a1a1a] px-4 py-3 sm:px-6">
              <div className="text-xs text-neutral-400">
                Showing page <span className="font-semibold text-white">{result.page}</span> of{' '}
                <span className="font-semibold text-white">{result.totalPages}</span> (
                {result.total} records)
              </div>
              <div className="flex items-center space-x-2">
                {result.page > 1 ? (
                  <Link
                    href={`/audit-logs?${new URLSearchParams({
                      ...searchParams,
                      page: String(result.page - 1),
                    }).toString()}`}
                    className="inline-flex items-center rounded-lg border border-[#262626] bg-[#141414] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-[#222222]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center rounded-lg border border-[#262626] bg-[#141414] px-3 py-1.5 text-xs font-semibold text-neutral-600 cursor-not-allowed">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </span>
                )}

                {result.page < result.totalPages ? (
                  <Link
                    href={`/audit-logs?${new URLSearchParams({
                      ...searchParams,
                      page: String(result.page + 1),
                    }).toString()}`}
                    className="inline-flex items-center rounded-lg border border-[#262626] bg-[#141414] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-[#222222]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center rounded-lg border border-[#262626] bg-[#141414] px-3 py-1.5 text-xs font-semibold text-neutral-600 cursor-not-allowed">
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
