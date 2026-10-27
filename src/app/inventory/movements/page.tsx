import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/backend/server/auth';
import { getMovementHistory } from '@/backend/server/movements';
import { getWarehouses } from '@/backend/server/warehouses';
import { getProducts } from '@/backend/server/products';
import { hasPermission, PERMISSIONS } from '@/shared/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { MovementActionToolbar } from '@/frontend/components/MovementActionToolbar';
import { MovementHistoryFilters } from '@/backend/server/movements';
import {
  History,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  User,
} from 'lucide-react';

interface MovementHistoryPageProps {
  searchParams: {
    warehouseId?: string;
    productId?: string;
    movementType?: string;
    search?: string;
    page?: string;
  };
}

export default async function MovementHistoryPage({ searchParams }: MovementHistoryPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const canReceive = hasPermission(user.role, PERMISSIONS.PURCHASING_RECEIVE);
  const canIssue = hasPermission(user.role, PERMISSIONS.PURCHASING_RECEIVE);
  const canAdjust = hasPermission(user.role, PERMISSIONS.INVENTORY_ADJUST_CREATE);

  const warehouseId = searchParams.warehouseId || '';
  const productId = searchParams.productId || '';
  const movementType =
    (searchParams.movementType as MovementHistoryFilters['movementType']) || undefined;
  const search = searchParams.search || '';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  // Fetch dropdown options and movement records concurrently
  const [warehouses, productsResult, movementsResult] = await Promise.all([
    getWarehouses(),
    getProducts({ limit: 100 }),
    getMovementHistory({
      warehouseId: warehouseId || undefined,
      productId: productId || undefined,
      movementType,
      search: search || undefined,
      page,
      limit: 15,
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Breadcrumbs and Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>Inventory</span>
              <span>/</span>
              <span className="text-emerald-700">Movement Ledger</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Append-Only Stock Ledger
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Immutable audit history of all physical incoming, outgoing, and discrepancy
              adjustments.
            </p>
          </div>

          <MovementActionToolbar
            warehouses={warehouses}
            products={productsResult.items}
            canReceive={canReceive}
            canIssue={canIssue}
            canAdjust={canAdjust}
          />
        </div>

        {/* Filter Toolbar */}
        <div className="my-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            method="GET"
            action="/inventory/movements"
            className="grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search reference, reason, SKU..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                name="warehouseId"
                defaultValue={warehouseId}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                name="movementType"
                defaultValue={searchParams.movementType ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Movement Types</option>
                <option value="RECEIPT">Stock Receipts (RECEIPT)</option>
                <option value="DISPATCH">Stock Issues (DISPATCH)</option>
                <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
                <option value="ADJUSTMENT_OUT">Adjustment Out (−)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Apply Filters
              </button>
              {(search || warehouseId || searchParams.movementType) && (
                <Link
                  href="/inventory/movements"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Ledger Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {movementsResult.total} Immutable Ledger Events Recorded
            </span>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Cryptographically Audited Append-Only Ledger</span>
            </div>
          </div>

          {movementsResult.items.length === 0 ? (
            <div className="p-12 text-center">
              <History className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">No movement history found</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {search || warehouseId || searchParams.movementType
                  ? 'No inventory movements matched the query filters.'
                  : 'No inventory stock-in or stock-out operations have occurred yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Timestamp & Reference
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Product Name & SKU
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Storage Facility
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Quantity
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Balance Snapshot
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Reason & Operator
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {movementsResult.items.map((mov) => {
                      const isPositive =
                        mov.movementType === 'RECEIPT' || mov.movementType === 'ADJUSTMENT_IN';

                      return (
                        <tr key={mov.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3">
                            <span className="block text-slate-900 font-medium">
                              {new Date(mov.createdAt).toLocaleString()}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              REF: {mov.referenceId} ({mov.referenceType})
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                mov.movementType === 'RECEIPT'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : mov.movementType === 'DISPATCH'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : mov.movementType === 'ADJUSTMENT_IN'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {mov.movementType === 'RECEIPT' && (
                                <ArrowDownLeft className="h-3 w-3" />
                              )}
                              {mov.movementType === 'DISPATCH' && (
                                <ArrowUpRight className="h-3 w-3" />
                              )}
                              {mov.movementType.startsWith('ADJUSTMENT') && (
                                <SlidersHorizontal className="h-3 w-3" />
                              )}
                              <span>{mov.movementType}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3 font-medium text-slate-900">
                            <Link
                              href={`/products/${mov.productId}`}
                              className="hover:text-emerald-600 hover:underline"
                            >
                              {mov.productName}
                            </Link>
                            <span className="block font-mono text-[10px] text-slate-500 uppercase">
                              {mov.sku}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-slate-800">
                            <Link
                              href={`/warehouses/${mov.warehouseId}`}
                              className="hover:text-emerald-600 hover:underline flex items-center space-x-1"
                            >
                              <Building className="h-3 w-3 text-slate-400" />
                              <span>{mov.warehouseName}</span>
                            </Link>
                            <span className="font-mono text-[10px] text-slate-400 uppercase">
                              {mov.warehouseCode}
                            </span>
                          </td>

                          <td
                            className={`px-4 py-3 text-right font-mono font-bold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}
                          >
                            {isPositive ? '+' : '−'}
                            {parseFloat(mov.quantity).toLocaleString()} {mov.uom}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-slate-600 whitespace-nowrap">
                            <span className="text-slate-400">
                              {parseFloat(mov.balanceBefore).toLocaleString()}
                            </span>
                            {' → '}
                            <strong className="text-slate-900">
                              {parseFloat(mov.balanceAfter).toLocaleString()}
                            </strong>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-600">
                            <p className="line-clamp-1 font-medium text-slate-800">{mov.reason}</p>
                            <p className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                              <User className="h-3 w-3" />
                              <span>{mov.actorName || mov.actorEmail || 'System Process'}</span>
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {movementsResult.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-white">
                  <span className="text-xs text-slate-500">
                    Page {movementsResult.page} of {movementsResult.totalPages}
                  </span>
                  <div className="flex items-center space-x-2">
                    {movementsResult.page > 1 && (
                      <Link
                        href={`/inventory/movements?page=${movementsResult.page - 1}&warehouseId=${warehouseId}&movementType=${searchParams.movementType || ''}&search=${search}`}
                        className="inline-flex items-center space-x-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Previous</span>
                      </Link>
                    )}
                    {movementsResult.page < movementsResult.totalPages && (
                      <Link
                        href={`/inventory/movements?page=${movementsResult.page + 1}&warehouseId=${warehouseId}&movementType=${searchParams.movementType || ''}&search=${search}`}
                        className="inline-flex items-center space-x-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
