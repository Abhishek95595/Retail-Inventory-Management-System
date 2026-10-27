import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getGoodsReceiptById } from '@/server/purchasing';
import { AppHeader } from '@/frontend/components/AppHeader';
import Link from 'next/link';
import { ArrowLeft, Truck } from 'lucide-react';
import { formatINR } from '@/lib/currency';

interface ReceiptDetailPageProps {
  params: { id: string };
}

export default async function GoodsReceiptDetailPage({ params }: ReceiptDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const receipt = await getGoodsReceiptById(params.id);
  if (!receipt) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <AppHeader user={session.user} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/purchasing/receipts"
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Receipts</span>
          </Link>
          <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Truck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Committed to Inventory</span>
          </span>
        </div>

        {/* Receipt Header Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                  {receipt.receiptNumber}
                </h1>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {receipt.itemCount} Received Lines
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Received on {new Date(receipt.receivedAt).toLocaleString()} by{' '}
                {receipt.receivedByName || 'Warehouse Staff'}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Physical Units
              </span>
              <span className="text-2xl font-black text-slate-900 font-mono">
                {receipt.totalQuantityReceived}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Purchase Order
              </p>
              <Link
                href={`/purchasing/${receipt.purchaseOrderId}`}
                className="font-bold text-emerald-600 hover:text-emerald-700 text-sm block"
              >
                {receipt.poNumber} →
              </Link>
              <p className="text-slate-500">Supplier: {receipt.supplierName}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Receiving Facility
              </p>
              <p className="font-bold text-slate-900 text-sm">{receipt.warehouseName}</p>
              <p className="text-slate-500 font-mono">Code: {receipt.warehouseCode}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Notes & Waybill Reference
              </p>
              <p className="text-slate-700 text-xs mt-0.5">
                {receipt.notes || 'No delivery notes specified.'}
              </p>
            </div>
          </div>
        </div>

        {/* Received Lines Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Credited Product Stock Lines</h2>
            <Link
              href="/inventory/movements"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Verify Movement Ledger Entries →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Quantity Received</th>
                  <th className="px-4 py-3 text-right">Agreed Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {receipt.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{item.sku}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{item.productName}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">({item.uom})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">
                      +{item.quantityReceived}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {formatINR(item.unitCost)}
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
