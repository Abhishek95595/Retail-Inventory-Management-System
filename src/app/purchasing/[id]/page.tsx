import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getPurchaseOrderById } from '@/server/purchasing';
import { AppHeader } from '@/frontend/components/AppHeader';
import { PurchaseOrderActions } from '@/frontend/components/PurchaseOrderActions';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Warehouse,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  XCircle,
} from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface PurchaseOrderDetailPageProps {
  params: { id: string };
}

export default async function PurchaseOrderDetailPage({ params }: PurchaseOrderDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const po = await getPurchaseOrderById(params.id);
  if (!po) {
    notFound();
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>Draft</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>Submitted for Approval</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Approved & Open for Receiving</span>
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Partially Received</span>
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Truck className="h-3.5 w-3.5 text-blue-500" />
            <span>Fully Received</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {st}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <AppHeader user={session.user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/purchasing"
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Purchase Orders</span>
          </Link>
          {getStatusBadge(po.status)}
        </div>

        {/* PO Header Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{po.poNumber}</h1>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {po.items.length} Product Lines
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Issued on {new Date(po.createdAt).toLocaleDateString()} by{' '}
                {po.createdByName || 'System'}
                {po.approvedByName && (
                  <span className="ml-2 font-medium text-emerald-700">
                    • Approved by {po.approvedByName}
                  </span>
                )}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Order Cost
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {formatINR(po.totalCost)}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <Building2 className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Supplier
                </p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{po.supplierName}</p>
                <p className="text-slate-500 font-mono mt-0.5">Code: {po.supplierCode}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <Warehouse className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Destination Warehouse
                </p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {po.destinationWarehouseName}
                </p>
                <p className="text-slate-500 font-mono mt-0.5">
                  Code: {po.destinationWarehouseCode}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <Calendar className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Arrival Timeline
                </p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {po.expectedArrivalDate
                    ? new Date(po.expectedArrivalDate).toLocaleDateString()
                    : 'Unscheduled Arrival'}
                </p>
                <p className="text-slate-500 mt-0.5">
                  Ordered: {po.totalQuantityOrdered} | Received: {po.totalQuantityReceived}
                </p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="border-t border-slate-100 pt-5">
            <PurchaseOrderActions
              orderId={po.id}
              poNumber={po.poNumber}
              status={po.status}
              userRole={session.user.role}
              items={po.items}
            />
          </div>
        </div>

        {/* PO Line Items Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Ordered Product Lines</h2>
            <span className="text-xs text-slate-500 font-medium">
              Progress: {po.totalQuantityReceived} / {po.totalQuantityOrdered} Units
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Product Name</th>
                  <th className="px-3 py-2.5 text-right">Ordered</th>
                  <th className="px-3 py-2.5 text-right">Received</th>
                  <th className="px-3 py-2.5 text-right">Outstanding</th>
                  <th className="px-3 py-2.5 text-right">Unit Cost</th>
                  <th className="px-3 py-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {po.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                      {item.sku}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-slate-900">{item.productName}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">({item.uom})</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{item.quantityOrdered}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                      {item.quantityReceived}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-amber-700">
                      {item.quantityOutstanding}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                      {formatINR(item.unitCost)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatINR(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Goods Receipts History */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Goods Receipt History</h2>
              <p className="text-xs text-slate-500">
                Physical shipments received into {po.destinationWarehouseName} for this order.
              </p>
            </div>
            <Link
              href="/inventory/movements"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View Full Movement Ledger →
            </Link>
          </div>

          {po.receipts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No goods receipts have been recorded for this purchase order yet.
            </p>
          ) : (
            <div className="space-y-3">
              {po.receipts.map((rc) => (
                <div
                  key={rc.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{rc.receiptNumber}</p>
                      <p className="text-slate-500 text-[11px]">
                        Received by {rc.receivedByName || 'Warehouse Staff'} on{' '}
                        {new Date(rc.receivedAt).toLocaleString()}
                        {rc.notes && <span className="ml-2 font-medium">• {rc.notes}</span>}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/purchasing/receipts/${rc.id}`}
                    className="flex items-center space-x-1 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
                  >
                    <span>Receipt Details</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
