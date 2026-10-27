'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  CheckCircle2,
  PackageCheck,
  XCircle,
  Loader2,
  AlertCircle,
  Edit,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

interface PurchaseOrderActionsProps {
  orderId: string;
  poNumber: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  userRole?: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    quantityOrdered: string;
    quantityReceived: string;
    quantityOutstanding: string;
    unitCost: string;
  }>;
}

export function PurchaseOrderActions({
  orderId,
  poNumber,
  status,
  userRole = '',
  items,
}: PurchaseOrderActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Goods receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptLines, setReceiptLines] = useState<
    Array<{ productId: string; quantityReceived: string }>
  >(
    items.map((i) => ({
      productId: i.productId,
      quantityReceived: i.quantityOutstanding,
    }))
  );
  const [receiptNotes, setReceiptNotes] = useState('');

  const executeAction = async (actionPath: string, actionName: string, body: any = {}) => {
    setError(null);
    setSuccess(null);
    setLoadingAction(actionName);

    try {
      const res = await fetch(`/api/purchase-orders/${orderId}/${actionPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Failed to execute ${actionName}`);
      }

      setSuccess(`Purchase Order successfully updated: ${actionName}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleProcessReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoadingAction('RECEIVE_GOODS');

    try {
      // Filter lines with positive received quantities
      const validLines = receiptLines.filter((l) => Number(l.quantityReceived) > 0);
      if (validLines.length === 0) {
        throw new Error('At least one product line must have a positive received quantity.');
      }

      const res = await fetch('/api/goods-receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: orderId,
          notes: receiptNotes || null,
          items: validLines.map((l) => ({
            productId: l.productId,
            quantityReceived: Number(l.quantityReceived),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to process goods receipt');
      }

      setSuccess(`Goods Receipt ${data.receiptNumber} processed successfully.`);
      setShowReceiptModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to process goods receipt');
    } finally {
      setLoadingAction(null);
    }
  };

  const canEdit = status === 'DRAFT';
  const canSubmit = status === 'DRAFT';
  const canApprove =
    status === 'SUBMITTED' && (userRole === 'ADMIN' || userRole === 'INVENTORY_MANAGER');
  const canReceive =
    (status === 'APPROVED' || status === 'PARTIALLY_RECEIVED') &&
    (userRole === 'ADMIN' || userRole === 'INVENTORY_MANAGER' || userRole === 'WAREHOUSE_STAFF');
  const canCancel =
    (status === 'DRAFT' || status === 'SUBMITTED' || status === 'APPROVED') &&
    (userRole === 'ADMIN' || userRole === 'INVENTORY_MANAGER');

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-start space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {canEdit && (
          <Link
            href={`/purchasing/${orderId}/edit`}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <Edit className="h-4 w-4 text-slate-500" />
            <span>Edit Draft PO</span>
          </Link>
        )}

        {canSubmit && (
          <button
            type="button"
            onClick={() => executeAction('submit', 'Submitted')}
            disabled={!!loadingAction}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
          >
            {loadingAction === 'Submitted' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Submit for Approval</span>
          </button>
        )}

        {canApprove && (
          <button
            type="button"
            onClick={() => executeAction('approve', 'Approved')}
            disabled={!!loadingAction}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
          >
            {loadingAction === 'Approved' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>Approve Purchase Order</span>
          </button>
        )}

        {canReceive && (
          <button
            type="button"
            onClick={() => setShowReceiptModal(true)}
            disabled={!!loadingAction}
            className="flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
          >
            <Truck className="h-4 w-4" />
            <span>Receive Goods</span>
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to cancel this purchase order?')) {
                executeAction('cancel', 'Cancelled');
              }
            }}
            disabled={!!loadingAction}
            className="flex items-center space-x-1.5 rounded-lg border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition shadow-sm ml-auto"
          >
            {loadingAction === 'Cancelled' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-500" />
            )}
            <span>Cancel PO</span>
          </button>
        )}
      </div>

      {/* Goods Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Receive Goods into Warehouse</h3>
                <p className="text-xs text-slate-500">
                  Record supplier delivery against {poNumber}. Increments on-hand inventory
                  atomically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessReceipt} className="space-y-4">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {items.map((line) => {
                  const receiptLine = receiptLines.find((r) => r.productId === line.productId);
                  return (
                    <div
                      key={line.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                    >
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-slate-900">
                          {line.productName} ({line.sku})
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Ordered: {line.quantityOrdered} {line.uom} | Received:{' '}
                          {line.quantityReceived} | Outstanding:{' '}
                          <span className="font-semibold text-emerald-700">
                            {line.quantityOutstanding}
                          </span>
                        </p>
                      </div>

                      <div className="w-36">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Receive Qty ({line.uom})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={line.quantityOutstanding}
                          value={receiptLine?.quantityReceived || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setReceiptLines((prev) =>
                              prev.map((r) =>
                                r.productId === line.productId ? { ...r, quantityReceived: val } : r
                              )
                            );
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes / Bill of Lading Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Supplier Invoice #9982, Carrier FedEx tracking"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction === 'RECEIVE_GOODS'}
                  className="flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {loadingAction === 'RECEIVE_GOODS' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}
                  <span>Commit Goods Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
