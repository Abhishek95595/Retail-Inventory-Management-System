import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getInventoryBalances, InventoryBalanceFilters } from '@/server/inventory';
import { getWarehouses } from '@/server/warehouses';
import { getCategories } from '@/server/categories';
import { AppHeader } from '@/components/AppHeader';
import {
  PackageSearch,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
} from 'lucide-react';

interface InventoryPageProps {
  searchParams: {
    warehouseId?: string;
    categoryId?: string;
    search?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const warehouseId = searchParams.warehouseId || '';
  const categoryId = searchParams.categoryId || '';
  const search = searchParams.search || '';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const sortBy = (searchParams.sortBy as InventoryBalanceFilters['sortBy']) || 'updatedAt';
  const sortOrder = (searchParams.sortOrder as InventoryBalanceFilters['sortOrder']) || 'desc';

  // Load filter options
  const [warehouseList, categoryList, balancesResult] = await Promise.all([
    getWarehouses(),
    getCategories(),
    getInventoryBalances({
      warehouseId: warehouseId || undefined,
      categoryId: categoryId || undefined,
      search: search || undefined,
      page,
      limit: 15,
      sortBy,
      sortOrder,
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>RIMS Core Operations</span>
              <span>/</span>
              <span className="text-emerald-700">Inventory</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Inventory Balance Ledger
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Live multi-warehouse stock balances strictly adhering to:{' '}
              <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[11px]">
                Available = On-Hand − Reserved − Quarantined
              </code>
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="my-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form method="GET" action="/inventory" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search SKU, product or facility..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                name="warehouseId"
                defaultValue={warehouseId}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All Warehouses</option>
                {warehouseList.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                name="categoryId"
                defaultValue={categoryId}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All Categories</option>
                {categoryList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Filter Balances
              </button>
              {(search || warehouseId || categoryId) && (
                <Link
                  href="/inventory"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Inventory Balances Grid */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              {balancesResult.total} Stock Positions Recorded
            </span>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>PostgreSQL Generated Column Formula Enforced</span>
            </div>
          </div>

          {balancesResult.items.length === 0 ? (
            <div className="p-12 text-center">
              <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                No inventory balances recorded
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                {search || warehouseId || categoryId
                  ? 'No inventory balance rows matched the applied filters.'
                  : 'No inventory balances have been initialized yet. Balance positions will be populated in Phase 6 as stock receiving is executed.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Product Name & SKU
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Storage Facility
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        On-Hand Qty
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Reserved Qty
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Quarantined Qty
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-bold text-emerald-800">
                        Available Qty
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Last Stock Event
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {balancesResult.items.map((bal) => (
                      <tr key={bal.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          <Link
                            href={`/products/${bal.productId}`}
                            className="hover:text-emerald-600 hover:underline"
                          >
                            {bal.productName}
                          </Link>
                          <span className="block font-mono text-[10px] text-slate-500 uppercase">
                            {bal.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {bal.categoryName || 'Uncategorized'}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-medium">
                          <Link
                            href={`/warehouses/${bal.warehouseId}`}
                            className="hover:text-emerald-600 hover:underline flex items-center space-x-1.5"
                          >
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <span>{bal.warehouseName}</span>
                          </Link>
                          <span className="font-mono text-[10px] text-slate-400 uppercase">
                            {bal.warehouseCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                          {parseFloat(bal.onHandQty).toLocaleString()} {bal.uom}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-700">
                          {parseFloat(bal.reservedQty).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {parseFloat(bal.quarantinedQty).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                          {parseFloat(bal.availableQty).toLocaleString()} {bal.uom}
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(bal.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Toolbar */}
              {balancesResult.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-white">
                  <span className="text-xs text-slate-500">
                    Page {balancesResult.page} of {balancesResult.totalPages}
                  </span>
                  <div className="flex items-center space-x-2">
                    {balancesResult.page > 1 && (
                      <Link
                        href={`/inventory?page=${balancesResult.page - 1}&warehouseId=${warehouseId}&categoryId=${categoryId}&search=${search}`}
                        className="inline-flex items-center space-x-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Previous</span>
                      </Link>
                    )}
                    {balancesResult.page < balancesResult.totalPages && (
                      <Link
                        href={`/inventory?page=${balancesResult.page + 1}&warehouseId=${warehouseId}&categoryId=${categoryId}&search=${search}`}
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
