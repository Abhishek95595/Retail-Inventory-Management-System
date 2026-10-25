import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getSalesOrders } from '@/server/orders';
import { getWarehouses } from '@/server/warehouses';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  PackageCheck,
  Boxes,
} from 'lucide-react';

interface OrdersPageProps {
  searchParams: {
    status?:
      'DRAFT' | 'CONFIRMED' | 'PICKING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
    warehouseId?: string;
    search?: string;
    page?: string;
  };
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const canCreate = hasPermission(user.role, PERMISSIONS.ORDERS_CREATE);

  const status = searchParams.status || undefined;
  const warehouseId = searchParams.warehouseId || undefined;
  const search = searchParams.search || '';
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const [warehouses, ordersResult] = await Promise.all([
    getWarehouses(),
    getSalesOrders({
      status,
      warehouseId,
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
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>Confirmed (Reserved)</span>
          </span>
        );
      case 'PICKING':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
            <Boxes className="h-3 w-3" />
            <span>Picking</span>
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 border border-indigo-200">
            <PackageCheck className="h-3 w-3" />
            <span>Packed</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
            <Truck className="h-3 w-3" />
            <span>Dispatched</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            <span>Delivered</span>
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
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Customer Fulfillment</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sales Orders & Stock Reservations
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage the end-to-end sales lifecycle with concurrency-safe stock reservations and
              atomic dispatching.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {canCreate && (
              <Link
                href="/orders/new"
                className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>New Sales Order</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <form
          method="GET"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="search"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Search Order / Customer
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="search"
                  type="text"
                  name="search"
                  defaultValue={search}
                  placeholder="SO-20261026-... or Customer Name"
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Order Lifecycle Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed (Stock Reserved)</option>
                <option value="PICKING">Picking</option>
                <option value="PACKED">Packed</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="warehouseId"
                className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
              >
                Fulfillment Facility
              </label>
              <select
                id="warehouseId"
                name="warehouseId"
                defaultValue={warehouseId || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Warehouses</option>
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
              Showing <strong className="text-slate-900">{ordersResult.total}</strong> sales orders
            </span>
            <div className="flex items-center space-x-2">
              <Link
                href="/orders"
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

        {/* Orders Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {ordersResult.items.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No sales orders found</h3>
              <p className="mt-1 text-xs text-slate-500">
                {search || status || warehouseId
                  ? 'No orders match the selected filter criteria.'
                  : 'No sales orders have been placed yet.'}
              </p>
              {canCreate && (
                <div className="mt-4">
                  <Link
                    href="/orders/new"
                    className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Order</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Fulfillment Facility</th>
                    <th className="py-3 px-4 text-center">Lines</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {ordersResult.items.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        <Link
                          href={`/orders/${ord.id}`}
                          className="text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          {ord.orderNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(ord.status)}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ord.customerName}</div>
                        {ord.customerEmail && (
                          <div className="text-[11px] text-slate-400">{ord.customerEmail}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <span>{ord.warehouseName}</span>
                        <span className="ml-1 text-[10px] text-slate-400 font-mono">
                          ({ord.warehouseCode})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {ord.itemCount} ({ord.totalQuantity} units)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${Number(ord.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/orders/${ord.id}`}
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
          {ordersResult.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50 text-xs">
              <span className="text-slate-500">
                Page <strong className="text-slate-900">{page}</strong> of{' '}
                <strong className="text-slate-900">{ordersResult.totalPages}</strong>
              </span>

              <div className="flex items-center space-x-2">
                {page > 1 ? (
                  <Link
                    href={`/orders?page=${page - 1}${status ? `&status=${status}` : ''}${warehouseId ? `&warehouseId=${warehouseId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
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

                {page < ordersResult.totalPages ? (
                  <Link
                    href={`/orders?page=${page + 1}${status ? `&status=${status}` : ''}${warehouseId ? `&warehouseId=${warehouseId}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
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
