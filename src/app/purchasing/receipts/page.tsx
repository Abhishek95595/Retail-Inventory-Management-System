import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getGoodsReceipts } from '@/server/purchasing';
import { AppHeader } from '@/components/AppHeader';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface ReceiptsPageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

export default async function GoodsReceiptsPage({ searchParams }: ReceiptsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || undefined;

  const data = await getGoodsReceipts({ page, limit: 15, search });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader user={session.user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Link
                href="/purchasing"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                ← Back to Purchasing
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
              Goods Receipts History
            </h1>
            <p className="text-sm text-slate-500">
              Audit log of all physical deliveries accepted from suppliers into warehouse
              facilities.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Receipt Number</th>
                  <th className="px-4 py-3">PO Number</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3 text-right">Items / Qty</th>
                  <th className="px-4 py-3">Received By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No goods receipts recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.items.map((rc) => (
                    <tr key={rc.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                        <Link
                          href={`/purchasing/receipts/${rc.id}`}
                          className="hover:text-emerald-600 transition"
                        >
                          {rc.receiptNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <Link
                          href={`/purchasing/${rc.purchaseOrderId}`}
                          className="hover:text-emerald-600 transition"
                        >
                          {rc.poNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{rc.supplierName}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{rc.warehouseName}</span>{' '}
                        <span className="text-[11px] text-slate-400 font-mono">
                          ({rc.warehouseCode})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {rc.itemCount} items ({rc.totalQuantityReceived})
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {rc.receivedByName || 'Warehouse Staff'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {new Date(rc.receivedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/purchasing/receipts/${rc.id}`}
                          className="inline-flex items-center space-x-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition shadow-sm"
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

          {data.totalPages > 1 && (
            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
              <div>
                Page {data.page} of {data.totalPages} ({data.total} total receipts)
              </div>
              <div className="flex space-x-2">
                {data.page > 1 && (
                  <Link
                    href={`/purchasing/receipts?page=${data.page - 1}`}
                    className="rounded border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {data.page < data.totalPages && (
                  <Link
                    href={`/purchasing/receipts?page=${data.page + 1}`}
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
