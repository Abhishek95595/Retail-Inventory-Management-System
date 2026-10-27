import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPurchaseOrders } from '@/backend/server/purchasing';
import { db } from '@/backend/db';
import { warehouses, suppliers } from '@/backend/db/schema';
import { AppHeader } from '@/frontend/components/AppHeader';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  Truck,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { formatINR } from '@/shared/currency';

interface PurchasingPageProps {
  searchParams: {
    page?: string;
    status?: any;
    supplierId?: string;
    warehouseId?: string;
    search?: string;
  };
}

export default async function PurchasingPage({ searchParams }: PurchasingPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const page = Number(searchParams.page) || 1;
  const status = searchParams.status || undefined;
  const supplierId = searchParams.supplierId || undefined;
  const warehouseId = searchParams.warehouseId || undefined;
  const search = searchParams.search || undefined;

  const [ordersData, warehousesList, suppliersList] = await Promise.all([
    getPurchaseOrders({ page, limit: 15, status, supplierId, warehouseId, search }),
    db.select({ id: warehouses.id, name: warehouses.name, code: warehouses.code }).from(warehouses),
    db.select({ id: suppliers.id, name: suppliers.name, code: suppliers.code }).from(suppliers),
  ]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            <Clock className="h-3 w-3 text-slate-500" />
            <span>Draft</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <Clock className="h-3 w-3 text-indigo-500" />
            <span>Submitted</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Approved</span>
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Partially Received</span>
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            <Truck className="h-3 w-3 text-blue-500" />
            <span>Received</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            <XCircle className="h-3 w-3 text-rose-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={session.user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Purchase Orders & Receiving
            </h1>
            <p className="text-sm text-slate-500">
              Manage supplier purchasing, approvals, and goods receipts into warehouse facilities.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/purchasing/receipts"
              className="flex items-center space-x-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <Truck className="h-4 w-4 text-slate-500" />
              <span>Receipt History</span>
            </Link>

            <Link
              href="/purchasing/new"
              className="flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Purchase Order</span>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search || ''}
                placeholder="Search PO#, supplier, warehouse..."
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                name="status"
                defaultValue={status || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="RECEIVED">Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <select
                name="supplierId"
                defaultValue={supplierId || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Suppliers</option>
                {suppliersList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-2">
              <select
                name="warehouseId"
                defaultValue={warehouseId || ''}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                <option value="">All Warehouses</option>
                {warehousesList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="flex items-center space-x-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filter</span>
              </button>
            </div>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Destination</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Items / Ordered</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Total Cost</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ordersData.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No purchase orders found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  ordersData.items.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <Link
                          href={`/purchasing/${order.id}`}
                          className="hover:text-emerald-600 transition"
                        >
                          {order.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{order.supplierName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {order.supplierCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">
                          {order.destinationWarehouseName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {order.destinationWarehouseCode}
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {order.itemCount} items ({order.totalQuantityOrdered})
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">
                        {order.totalQuantityReceived}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                        {formatINR(order.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/purchasing/${order.id}`}
                          className="inline-flex items-center space-x-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
                        >
                          <span>View</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {ordersData.totalPages > 1 && (
            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
              <div>
                Page {ordersData.page} of {ordersData.totalPages} ({ordersData.total} total orders)
              </div>
              <div className="flex space-x-2">
                {ordersData.page > 1 && (
                  <Link
                    href={`/purchasing?page=${ordersData.page - 1}`}
                    className="rounded border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {ordersData.page < ordersData.totalPages && (
                  <Link
                    href={`/purchasing?page=${ordersData.page + 1}`}
                    className="rounded border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
