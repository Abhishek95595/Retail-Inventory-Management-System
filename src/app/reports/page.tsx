import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getInventoryReport } from '@/server/reporting';
import { getWarehouses } from '@/server/warehouses';
import { getCategories } from '@/server/categories';
import { AppHeader } from '@/frontend/components/AppHeader';
import {
  FileSpreadsheet,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Boxes,
  IndianRupee,
  RotateCcw,
} from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface ReportsPageProps {
  searchParams: {
    warehouseId?: string;
    categoryId?: string;
    search?: string;
    lowStockOnly?: string;
    outOfStockOnly?: string;
    page?: string;
  };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  if (!hasPermission(user.role, PERMISSIONS.REPORTS_READ)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AppHeader user={user} />
        <main className="max-w-4xl mx-auto py-16 px-4 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <h1 className="text-xl font-bold text-red-900">Access Denied</h1>
            <p className="mt-2 text-sm text-red-700">
              Your role ({user.role}) does not have permission to access operational reports.
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

  const warehouseId = searchParams.warehouseId || '';
  const categoryId = searchParams.categoryId || '';
  const search = searchParams.search || '';
  const lowStockOnly = searchParams.lowStockOnly === 'true';
  const outOfStockOnly = searchParams.outOfStockOnly === 'true';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const [warehouseList, categoryList, report] = await Promise.all([
    getWarehouses().catch(() => []),
    getCategories().catch(() => []),
    getInventoryReport({
      warehouseId: warehouseId || undefined,
      categoryId: categoryId || undefined,
      search: search || undefined,
      lowStockOnly,
      outOfStockOnly,
      page,
      limit: 20,
    }),
  ]);

  const canExport = hasPermission(user.role, PERMISSIONS.REPORTS_EXPORT);

  // Construct CSV query string
  const csvParams = new URLSearchParams();
  csvParams.set('format', 'csv');
  if (warehouseId) csvParams.set('warehouseId', warehouseId);
  if (categoryId) csvParams.set('categoryId', categoryId);
  if (search) csvParams.set('search', search);
  if (lowStockOnly) csvParams.set('lowStockOnly', 'true');
  if (outOfStockOnly) csvParams.set('outOfStockOnly', 'true');
  const csvExportUrl = `/api/reports/inventory?${csvParams.toString()}`;

  return (
    <div className="min-h-screen bg-[#171717] text-neutral-100 pb-16">
      <AppHeader user={user} />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 rounded-full bg-[#06110C] px-2.5 py-0.5 text-xs font-semibold text-neutral-300 border border-[#262626] mb-2">
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#A31C1B]" />
              <span>Executive Operational Reports</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Inventory Valuation & Facility Report
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Multi-facility balance breakdown, available stock tracking, and defensible cost-basis
              valuation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canExport && (
              <a
                href={csvExportUrl}
                download="inventory-report.csv"
                className="inline-flex items-center space-x-2 rounded-xl bg-[#A31C1B] hover:bg-[#8a1817] text-white px-4 py-2.5 text-xs font-bold tracking-wide uppercase shadow-sm transition-all"
                title="Export current filter dataset to secure CSV"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </a>
            )}
          </div>
        </div>

        {/* Aggregation Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <span>Total On Hand Units</span>
              <Boxes className="h-4 w-4 text-neutral-500" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {Number(report.summary.totalOnHand).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-neutral-400">Across matching warehouse balances</p>
          </div>

          <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <span>Total Available Units</span>
              <Boxes className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {Number(report.summary.totalAvailable).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-neutral-400">
              Excludes reserved and quarantined inventory
            </p>
          </div>

          <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-5 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <span>Filtered Valuation</span>
              <IndianRupee className="h-4 w-4 text-[#A31C1B]" />
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatINR(report.summary.totalValuation)}
            </div>
            <p className="text-[11px] text-neutral-400">Cost basis: Unit Cost × On-Hand Qty</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-4 shadow-sm">
          <form method="GET" action="/reports" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search text */}
              <div>
                <label
                  htmlFor="search"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  Search SKU / Product / Facility
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    id="search"
                    name="search"
                    type="text"
                    defaultValue={search}
                    placeholder="Search SKU or name..."
                    className="w-full rounded-lg border border-[#333333] bg-[#141414] pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none"
                  />
                </div>
              </div>

              {/* Warehouse selector */}
              <div>
                <label
                  htmlFor="warehouseId"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  Warehouse Facility
                </label>
                <select
                  id="warehouseId"
                  name="warehouseId"
                  defaultValue={warehouseId}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white focus:border-[#A31C1B] focus:outline-none"
                >
                  <option value="" className="bg-[#1a1a1a] text-white">
                    All Warehouses
                  </option>
                  {warehouseList.map((w: any) => (
                    <option key={w.id} value={w.id} className="bg-[#1a1a1a] text-white">
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category selector */}
              <div>
                <label
                  htmlFor="categoryId"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1"
                >
                  Product Category
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={categoryId}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white focus:border-[#A31C1B] focus:outline-none"
                >
                  <option value="" className="bg-[#1a1a1a] text-white">
                    All Categories
                  </option>
                  {categoryList.map((c: any) => (
                    <option key={c.id} value={c.id} className="bg-[#1a1a1a] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles & Submit */}
              <div className="flex flex-col justify-end space-y-2">
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center space-x-1.5 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="lowStockOnly"
                      value="true"
                      defaultChecked={lowStockOnly}
                      className="rounded border-[#333333] bg-[#141414] text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-semibold text-amber-400">Low Stock Only</span>
                  </label>

                  <label className="inline-flex items-center space-x-1.5 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      name="outOfStockOnly"
                      value="true"
                      defaultChecked={outOfStockOnly}
                      className="rounded border-[#333333] bg-[#141414] text-rose-500 focus:ring-rose-500"
                    />
                    <span className="font-semibold text-rose-400">Zero Stock</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-[#262626] hover:bg-[#333333] text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all"
                  >
                    Apply Filters
                  </button>
                  <Link
                    href="/reports"
                    className="inline-flex items-center justify-center rounded-lg border border-[#333333] bg-[#141414] hover:bg-[#222222] px-3 py-1.5 text-xs font-medium text-neutral-300"
                    title="Reset all filters"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Report Data Table */}
        <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-[#06110C] border-b border-[#262626] text-neutral-300 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Product / SKU
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Facility
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    On Hand
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Reserved
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Quarantined
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-bold text-emerald-400">
                    Available
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Unit Cost
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Valuation
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] bg-[#1a1a1a]">
                {report.items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-neutral-500">
                      <Boxes className="mx-auto h-8 w-8 text-neutral-600 mb-2" />
                      <p className="font-semibold text-neutral-300">No inventory balances found</p>
                      <p className="text-[11px] text-neutral-500 mt-1">
                        Try adjusting your search terms or filter criteria.
                      </p>
                    </td>
                  </tr>
                ) : (
                  report.items.map((row) => (
                    <tr
                      key={`${row.productId}-${row.warehouseId}`}
                      className="hover:bg-[#222222] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/products/${row.productId}`}
                          className="font-semibold text-white hover:text-[#f8b4b4] hover:underline"
                        >
                          {row.productName}
                        </Link>
                        <div className="font-mono text-[11px] text-neutral-400">{row.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-neutral-300">{row.categoryName}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-neutral-200">{row.warehouseName}</span>
                        <div className="font-mono text-[10px] text-neutral-400">
                          {row.warehouseCode}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-300">
                        {row.onHandQty}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        {row.reservedQty}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-400">
                        {row.quarantinedQty}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                        {row.availableQty}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-400">
                        {formatINR(row.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        {formatINR(row.lineValuation)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.isOutOfStock ? (
                          <span className="inline-flex items-center rounded-md bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-800/60">
                            OUT OF STOCK
                          </span>
                        ) : row.isLowStock ? (
                          <span className="inline-flex items-center rounded-md bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-800/60">
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-800/60">
                            NORMAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {report.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#262626] bg-[#1a1a1a] px-4 py-3 sm:px-6">
              <div className="text-xs text-neutral-400">
                Showing page <span className="font-semibold text-white">{report.page}</span> of{' '}
                <span className="font-semibold text-white">{report.totalPages}</span> (
                {report.total} items)
              </div>
              <div className="flex items-center space-x-2">
                {report.page > 1 ? (
                  <Link
                    href={`/reports?${new URLSearchParams({
                      ...searchParams,
                      page: String(report.page - 1),
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

                {report.page < report.totalPages ? (
                  <Link
                    href={`/reports?${new URLSearchParams({
                      ...searchParams,
                      page: String(report.page + 1),
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
