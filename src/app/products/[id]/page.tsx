import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getProductById } from '@/server/products';
import { getProductInventoryBalances } from '@/server/inventory';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import { Boxes, ArrowLeft, Edit, Tag, Truck, RotateCcw } from 'lucide-react';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const product = await getProductById(params.id);
  if (!product) {
    notFound();
  }

  const canManage = hasPermission(user.role, PERMISSIONS.CATALOG_MANAGE);
  const warehouseBalances = await getProductInventoryBalances(product.id);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Back link & Actions */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/products"
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Products Directory</span>
            </Link>

            {canManage && (
              <Link
                href={`/products/${product.id}/edit`}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Product</span>
              </Link>
            )}
          </div>

          {/* Product Overview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover rounded-xl"
                    />
                  ) : (
                    <Boxes className="h-7 w-7 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                      SKU: {product.sku}
                    </span>
                    {product.isArchived ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Archived
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Active Catalog Item
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
                    {product.name}
                  </h1>
                  {product.barcode && (
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Barcode / UPC: {product.barcode}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  Selling Price
                </p>
                <p className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">
                  ${parseFloat(product.sellingPrice).toFixed(2)}
                </p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Cost: ${parseFloat(product.costPrice).toFixed(2)}
                </p>
              </div>
            </div>

            {product.description && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Product Description
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* Details Specifications Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-500 mb-2">
                <Tag className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Classification</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">{product.categoryName}</p>
              <p className="text-xs text-slate-500 mt-1">Brand: {product.brand || 'Unbranded'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Unit of Measure: {product.uom}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-500 mb-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Procurement</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {product.supplierName || 'No Preferred Supplier'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Standard Cost: ${product.costPrice}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-500 mb-2">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Replenishment</span>
              </div>
              <p className="text-sm font-semibold text-slate-900">
                Threshold: {product.reorderPoint} {product.uom}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Batch Order Qty: {product.reorderQuantity} {product.uom}
              </p>
            </div>
          </div>

          {/* Per-Facility Inventory Balances */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Per-Facility Inventory Balances
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stock availability across all active storage warehouses.
                </p>
              </div>
              <Link
                href={`/inventory?productId=${product.id}`}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                View in Inventory Ledger →
              </Link>
            </div>

            {warehouseBalances.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No inventory balances currently recorded for this product across any warehouse.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Warehouse Facility
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        On-Hand
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Reserved
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Quarantined
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-bold text-emerald-800">
                        Available
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Facility Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {warehouseBalances.map((bal) => (
                      <tr key={bal.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <Link
                            href={`/warehouses/${bal.warehouseId}`}
                            className="hover:text-emerald-600 hover:underline"
                          >
                            {bal.warehouseName}
                          </Link>
                          <span className="block font-mono text-[10px] text-slate-500 uppercase">
                            {bal.warehouseCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                          {parseFloat(bal.onHandQty).toLocaleString()} {product.uom}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-amber-700">
                          {parseFloat(bal.reservedQty).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {parseFloat(bal.quarantinedQty).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                          {parseFloat(bal.availableQty).toLocaleString()} {product.uom}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              bal.warehouseIsActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {bal.warehouseIsActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
