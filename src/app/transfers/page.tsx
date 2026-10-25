import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getTransfers } from '@/server/transfers';
import { getWarehouses } from '@/server/warehouses';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
} from 'lucide-react';

interface TransfersPageProps {
  searchParams: {
    status?: 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
    search?: string;
    page?: string;
  };
}

export default async function TransfersPage({ searchParams }: TransfersPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const canManage = hasPermission(user.role, PERMISSIONS.INVENTORY_TRANSFER_MANAGE);

  const status = searchParams.status || undefined;
  const sourceWarehouseId = searchParams.sourceWarehouseId || undefined;
  const destinationWarehouseId = searchParams.destinationWarehouseId || undefined;
  const search = searchParams.search || '';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const [warehouses, transfersResult] = await Promise.all([
    getWarehouses(),
    getTransfers({
      status,
      sourceWarehouseId,
      destinationWarehouseId,
      search: search || undefined,
      page,
      limit: 15,
    }),
  ]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            <Clock className="h-3 w-3" />
            <span>Draft</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <Truck className="h-3 w-3" />
            <span>In Transit (Dispatched)</span>
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>Received</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800 border border-red-200">
            <XCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Inter-Warehouse Logistics</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock Transfers</h1>
            <p className="mt-1 text-xs text-slate-500">
              Multi-facility inventory rebalancing with atomic dispatch, in-transit accounting, and
              idempotent receipt.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {canManage && (
              <Link
                href="/transfers/new"
                className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Transfer</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <form
          method="GET"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="search"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Search Reference / Notes
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="search"
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="TRF-20261026-..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Transfer Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="DISPATCHED">Dispatched (In Transit)</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sourceWarehouseId"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Source Facility
              </label>
              <select
                id="sourceWarehouseId"
                name="sourceWarehouseId"
                defaultValue={sourceWarehouseId || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Source Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="destinationWarehouseId"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Destination Facility
              </label>
              <select
                id="destinationWarehouseId"
                name="destinationWarehouseId"
                defaultValue={destinationWarehouseId || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Destination Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-medium text-slate-500">
              Showing <strong className="text-slate-900">{transfersResult.total}</strong> transfers
            </span>
            <div className="flex items-center space-x-2">
              <Link
                href="/transfers"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Reset
              </Link>
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </form>

        {/* Transfers Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {transfersResult.items.length === 0 ? (
            <div className="py-16 text-center">
              <ArrowLeftRight className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No transfers found</h3>
              <p className="mt-1 text-xs text-slate-500">
                {search || status || sourceWarehouseId || destinationWarehouseId
                  ? 'No transfers match the selected filter criteria.'
                  : 'No inter-warehouse transfers have been created yet.'}
              </p>
              {canManage && (
                <div className="mt-4">
                  <Link
                    href="/transfers/new"
                    className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Transfer</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Transfer Number</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Route (Source → Destination)</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Total Quantity</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {transfersResult.items.map((trf) => (
                    <tr key={trf.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/transfers/${trf.id}`}
                          className="text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          {trf.transferNumber}
                        </Link>
                        {trf.notes && (
                          <p className="font-sans text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                            {trf.notes}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(trf.status)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-700">
                          <span className="font-semibold">{trf.sourceWarehouseName}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-semibold text-slate-900">
                            {trf.destinationWarehouseName}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {trf.sourceWarehouseCode} → {trf.destinationWarehouseCode}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                          <Package className="h-3 w-3 text-slate-500" />
                          <span>{trf.itemCount}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {trf.totalQuantity}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(trf.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/transfers/${trf.id}`}
                          className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
                        >
                          <span>Manage</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {transfersResult.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50 text-xs">
              <span className="text-slate-500">
                Page <strong className="text-slate-900">{page}</strong> of{' '}
                <strong className="text-slate-900">{transfersResult.totalPages}</strong>
              </span>

              <div className="flex items-center space-x-2">
                {page > 1 ? (
                  <Link
                    href={`/transfers?page=${page - 1}${status ? `&status=${status}` : ''}${sourceWarehouseId ? `&sourceWarehouseId=${sourceWarehouseId}` : ''}${destinationWarehouseId ? `&destinationWarehouseId=${destinationWarehouseId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-400 font-semibold cursor-not-allowed">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </span>
                )}

                {page < transfersResult.totalPages ? (
                  <Link
                    href={`/transfers?page=${page + 1}${status ? `&status=${status}` : ''}${sourceWarehouseId ? `&sourceWarehouseId=${sourceWarehouseId}` : ''}${destinationWarehouseId ? `&destinationWarehouseId=${destinationWarehouseId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
                    className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50 font-semibold shadow-sm"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-400 font-semibold cursor-not-allowed">
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
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
