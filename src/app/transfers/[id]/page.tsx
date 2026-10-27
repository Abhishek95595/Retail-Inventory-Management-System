import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/backend/server/auth';
import { getTransferById } from '@/backend/server/transfers';
import { hasPermission, PERMISSIONS } from '@/shared/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { TransferActions } from '@/frontend/components/TransferActions';
import { ChevronRight, Building, Clock, History, Truck, CheckCircle2, XCircle } from 'lucide-react';

interface TransferDetailPageProps {
  params: {
    id: string;
  };
}

export default async function TransferDetailPage({ params }: TransferDetailPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const transfer = await getTransferById(params.id);
  if (!transfer) {
    notFound();
  }

  const canDispatch = hasPermission(user.role, PERMISSIONS.INVENTORY_TRANSFER_DISPATCH);
  const canReceive = hasPermission(user.role, PERMISSIONS.INVENTORY_TRANSFER_RECEIVE);
  const canCancel = hasPermission(user.role, PERMISSIONS.INVENTORY_TRANSFER_MANAGE);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 border border-slate-200">
            <Clock className="h-3.5 w-3.5" />
            <span>Draft Transfer</span>
          </span>
        );
      case 'DISPATCHED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
            <Truck className="h-3.5 w-3.5" />
            <span>In Transit (Dispatched)</span>
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Received & Completed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-900 border border-red-200">
            <XCircle className="h-3.5 w-3.5" />
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
          <Link href="/transfers" className="hover:text-slate-900">
            Stock Transfers
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="font-mono text-emerald-700">{transfer.transferNumber}</span>
        </div>

        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900">
                {transfer.transferNumber}
              </h1>
              {getStatusBadge(transfer.status)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Inter-warehouse stock shipment reference and immutable ledger tracking.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/inventory/movements?search=${encodeURIComponent(transfer.transferNumber)}`}
              className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              <span>View Movements</span>
            </Link>
          </div>
        </div>

        {/* Transfer Action Controls */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Workflow Actions
          </h3>
          <TransferActions
            transferId={transfer.id}
            transferNumber={transfer.transferNumber}
            status={transfer.status}
            canDispatch={canDispatch}
            canReceive={canReceive}
            canCancel={canCancel}
          />
        </div>

        {/* Facility Routing Card */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <Building className="h-3.5 w-3.5 text-amber-600" />
              <span>Origin / Source Facility</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">{transfer.sourceWarehouseName}</h4>
            <p className="font-mono text-xs text-slate-500 mt-0.5">
              Code: {transfer.sourceWarehouseCode}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Dispatched Timestamp:</span>
              <span className="font-medium text-slate-900">
                {transfer.dispatchedAt
                  ? new Date(transfer.dispatchedAt).toLocaleString()
                  : 'Pending Dispatch'}
              </span>
            </div>
            {transfer.dispatchedByName && (
              <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                <span>Dispatched By:</span>
                <span className="font-medium text-slate-900">{transfer.dispatchedByName}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <Building className="h-3.5 w-3.5 text-emerald-600" />
              <span>Receiving / Destination Facility</span>
            </div>
            <h4 className="text-base font-bold text-slate-900">
              {transfer.destinationWarehouseName}
            </h4>
            <p className="font-mono text-xs text-slate-500 mt-0.5">
              Code: {transfer.destinationWarehouseCode}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Received Timestamp:</span>
              <span className="font-medium text-slate-900">
                {transfer.receivedAt
                  ? new Date(transfer.receivedAt).toLocaleString()
                  : 'Pending Receipt'}
              </span>
            </div>
            {transfer.receivedByName && (
              <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                <span>Received By:</span>
                <span className="font-medium text-slate-900">{transfer.receivedByName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes Card */}
        {transfer.notes && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-700">
            <span className="font-semibold text-slate-900 block mb-1">Logistics Notes:</span>
            {transfer.notes}
          </div>
        )}

        {/* Transfer Line Items Table */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Transfer Line Items ({transfer.itemCount})
              </h3>
              <p className="text-xs text-slate-500">
                Products and quantities allocated for transit across facilities.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Shipment Quantity:</span>
              <p className="text-base font-mono font-bold text-slate-900">
                {transfer.totalQuantity} units
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Catalog Product</th>
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-4">Unit of Measure</th>
                  <th className="py-3 px-4 text-right">Transfer Quantity</th>
                  <th className="py-3 px-4 text-right">Catalog Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transfer.items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{it.productName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{it.sku}</td>
                    <td className="py-3.5 px-4 text-slate-500">{it.uom}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {it.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/products/${it.productId}`}
                        className="text-emerald-700 hover:text-emerald-800 hover:underline font-semibold"
                      >
                        View Product
                      </Link>
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
