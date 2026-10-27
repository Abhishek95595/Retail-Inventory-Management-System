import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getSalesOrderById } from '@/server/orders';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { OrderActions } from '@/frontend/components/OrderActions';
import {
  ChevronRight,
  Building,
  User,
  History,
  Clock,
  CheckCircle2,
  Boxes,
  PackageCheck,
  Truck,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const order = await getSalesOrderById(params.id);
  if (!order) {
    notFound();
  }

  const canCreate = hasPermission(user.role, PERMISSIONS.ORDERS_CREATE);
  const canFulfill = hasPermission(user.role, PERMISSIONS.ORDERS_FULFILL);
  const canCancel = hasPermission(user.role, PERMISSIONS.ORDERS_CANCEL);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 border border-slate-200">
            <Clock className="h-3.5 w-3.5" />
            <span>Draft Order</span>
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Confirmed (Stock Reserved)</span>
          </span>
        );
      case 'PICKING':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
            <Boxes className="h-3.5 w-3.5 text-amber-700" />
            <span>Picking in Progress</span>
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900 border border-indigo-200">
            <PackageCheck className="h-3.5 w-3.5 text-indigo-700" />
            <span>Packed & Ready</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 border border-blue-200">
            <Truck className="h-3.5 w-3.5 text-blue-700" />
            <span>Dispatched</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
            <span>Delivered & Finalized</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-900 border border-red-200">
            <XCircle className="h-3.5 w-3.5 text-red-700" />
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

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-2">
          <Link href="/orders" className="hover:text-slate-900">
            Sales Orders
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="font-mono text-emerald-700">{order.orderNumber}</span>
        </div>

        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900">{order.orderNumber}</h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Customer order for {order.customerName} • Fulfillment from {order.warehouseName}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/inventory/movements?search=${encodeURIComponent(order.orderNumber)}`}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              <span>Audit Movements</span>
            </Link>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Order Lifecycle Actions
          </h3>
          <OrderActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            status={order.status}
            canCreate={canCreate}
            canFulfill={canFulfill}
            canCancel={canCancel}
          />
        </div>

        {/* Customer & Fulfillment Info Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span>Customer Information</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{order.customerName}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Email: {order.customerEmail || 'No email specified'}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Order Created Date:</span>
              <span className="font-medium text-slate-900">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
            {order.createdByName && (
              <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                <span>Created By:</span>
                <span className="font-medium text-slate-900">{order.createdByName}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <Building className="h-3.5 w-3.5 text-blue-600" />
              <span>Fulfillment Warehouse</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{order.warehouseName}</h4>
            <p className="font-mono text-xs text-slate-500 mt-0.5">
              Facility Code: {order.warehouseCode}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Total Line Items:</span>
              <span className="font-medium text-slate-900">{order.itemCount} line(s)</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
              <span>Order Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatINR(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Stock Reservations Status (if confirmed) */}
        {order.reservations.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Active Stock Reservations ({order.reservations.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Stock currently held at fulfillment warehouse to guarantee order fulfillment.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">SKU</th>
                    <th className="py-2.5 px-4 text-right">Reserved Qty</th>
                    <th className="py-2.5 px-4 text-center">Reservation Status</th>
                    <th className="py-2.5 px-4">Reserved At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-mono">
                  {order.reservations.map((res) => (
                    <tr key={res.id}>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                        {res.productName}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{res.sku}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {res.reservedQty}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold ${
                            res.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.status === 'FULFILLED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {res.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-500 text-[11px]">
                        {new Date(res.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Line Items */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Order Line Items ({order.itemCount})
              </h3>
              <p className="text-xs text-slate-500">
                Agreed price and quantities captured at order creation.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Order Amount:</span>
              <p className="text-lg font-mono font-bold text-slate-900">
                {formatINR(order.totalAmount)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Catalog Product</th>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {order.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{it.productName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{it.sku}</td>
                    <td className="py-3.5 px-4 text-slate-500">{it.uom}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {it.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                      {formatINR(it.unitPrice)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(it.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
