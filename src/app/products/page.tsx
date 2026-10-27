import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getProducts } from '@/server/products';
import { getCategories } from '@/server/categories';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { ProductFilters } from '@/server/products';
import { Boxes, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface ProductsPageProps {
  searchParams: {
    search?: string;
    categoryId?: string;
    isArchived?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const canManage = hasPermission(user.role, PERMISSIONS.CATALOG_MANAGE);
  const categoriesList = await getCategories();

  const search = searchParams.search || '';
  const categoryId = searchParams.categoryId || '';
  const isArchived = searchParams.isArchived === 'true';
  const sortBy = (searchParams.sortBy as ProductFilters['sortBy']) || 'createdAt';
  const sortOrder = (searchParams.sortOrder as ProductFilters['sortOrder']) || 'desc';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const { items, total, totalPages } = await getProducts({
    search: search || undefined,
    categoryId: categoryId || undefined,
    isArchived,
    sortBy,
    sortOrder,
    page,
    limit: 10,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#171717] text-neutral-100">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center space-x-1.5 rounded-full bg-[#06110C] px-2.5 py-0.5 text-xs font-semibold text-neutral-300 border border-[#262626] mb-2">
                <Boxes className="h-3.5 w-3.5 text-[#A31C1B]" />
                <span>Product Master Catalog</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Products Directory</h1>
              <p className="text-xs text-neutral-400 mt-1">
                Maintain product SKUs, pricing structures, reorder triggers, and supplier
                allocations.
              </p>
            </div>

            {canManage && (
              <Link
                href="/products/new"
                className="inline-flex items-center space-x-2 rounded-lg bg-[#A31C1B] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#8a1817] transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Product</span>
              </Link>
            )}
          </div>

          {/* Filter Bar */}
          <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-4 shadow-sm mb-6">
            <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-neutral-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="Search SKU, name, barcode..."
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] py-1.5 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                />
              </div>

              <div>
                <select
                  name="categoryId"
                  defaultValue={categoryId}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] py-1.5 px-3 text-xs text-white focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                >
                  <option value="" className="bg-[#1a1a1a] text-white">
                    All Categories
                  </option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-[#1a1a1a] text-white">
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  name="sortBy"
                  defaultValue={sortBy}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] py-1.5 px-3 text-xs text-white focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                >
                  <option value="createdAt" className="bg-[#1a1a1a] text-white">
                    Sort: Created Date
                  </option>
                  <option value="name" className="bg-[#1a1a1a] text-white">
                    Sort: Product Name
                  </option>
                  <option value="sku" className="bg-[#1a1a1a] text-white">
                    Sort: SKU
                  </option>
                  <option value="costPrice" className="bg-[#1a1a1a] text-white">
                    Sort: Cost Price
                  </option>
                  <option value="sellingPrice" className="bg-[#1a1a1a] text-white">
                    Sort: Selling Price
                  </option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#262626] py-1.5 px-3 text-xs font-semibold text-white hover:bg-[#333333] transition"
                >
                  Apply Filters
                </button>
                {search || categoryId ? (
                  <Link
                    href="/products"
                    className="rounded-lg border border-[#333333] bg-[#141414] py-1.5 px-3 text-xs font-semibold text-neutral-300 hover:bg-[#222222] transition"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </div>

          {/* Product Data Grid */}
          <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] shadow-sm overflow-hidden mb-6">
            {items.length === 0 ? (
              <div className="p-12 text-center">
                <Boxes className="mx-auto h-12 w-12 text-neutral-600" />
                <h3 className="mt-3 text-sm font-semibold text-white">No products found</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  {search || categoryId
                    ? 'No products match your search and filter criteria.'
                    : 'Get started by creating your first catalog product.'}
                </p>
                {canManage && !search && !categoryId && (
                  <div className="mt-6">
                    <Link
                      href="/products/new"
                      className="inline-flex items-center rounded-lg bg-[#A31C1B] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#8a1817] transition"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create First Product
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#262626] text-left text-xs">
                  <thead className="bg-[#06110C] font-semibold text-neutral-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Product / SKU
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Category
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Cost Price
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Selling Price
                      </th>
                      <th scope="col" className="px-4 py-3 text-center">
                        Reorder Point
                      </th>
                      <th scope="col" className="px-4 py-3 text-center">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626] bg-[#1a1a1a]">
                    {items.map((prod) => (
                      <tr key={prod.id} className="hover:bg-[#222222] transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white">{prod.name}</div>
                          <div className="flex items-center space-x-2 font-mono text-[11px] text-neutral-400 mt-0.5">
                            <span>SKU: {prod.sku}</span>
                            {prod.barcode && <span>• Barcode: {prod.barcode}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-neutral-300">
                          <span className="inline-flex items-center rounded bg-[#06110C] border border-[#262626] px-2 py-0.5 text-[11px] font-medium text-neutral-200">
                            {prod.categoryName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-neutral-300">
                          {formatINR(prod.costPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-white">
                          {formatINR(prod.sellingPrice)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-neutral-400">
                          {prod.reorderPoint} {prod.uom}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {prod.isArchived ? (
                            <span className="rounded-full bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              Archived
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-3 font-medium">
                          <Link
                            href={`/products/${prod.id}`}
                            className="text-neutral-400 hover:text-white transition"
                          >
                            View
                          </Link>
                          {canManage && (
                            <Link
                              href={`/products/${prod.id}/edit`}
                              className="text-[#f8b4b4] hover:text-white transition"
                            >
                              Edit
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <p>
                Showing Page <span className="font-semibold text-white">{page}</span> of{' '}
                <span className="font-semibold text-white">{totalPages}</span> ({total} products)
              </p>
              <div className="flex items-center space-x-2">
                {page > 1 ? (
                  <Link
                    href={`/products?page=${page - 1}&search=${encodeURIComponent(
                      search
                    )}&categoryId=${encodeURIComponent(categoryId)}`}
                    className="flex items-center space-x-1 rounded border border-[#262626] bg-[#1a1a1a] px-2.5 py-1 text-neutral-300 hover:bg-[#222222]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link
                    href={`/products?page=${page + 1}&search=${encodeURIComponent(
                      search
                    )}&categoryId=${encodeURIComponent(categoryId)}`}
                    className="flex items-center space-x-1 rounded border border-[#262626] bg-[#1a1a1a] px-2.5 py-1 text-neutral-300 hover:bg-[#222222]"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
