'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationType: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT';
  warehouses: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  products: Array<{ id: string; name: string; sku: string; uom: string; isArchived: boolean }>;
  preselectedWarehouseId?: string;
  preselectedProductId?: string;
}

export function MovementModal({
  isOpen,
  onClose,
  operationType,
  warehouses,
  products,
  preselectedWarehouseId,
  preselectedProductId,
}: MovementModalProps) {
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState(
    preselectedWarehouseId || (warehouses[0]?.id ?? '')
  );
  const [productId, setProductId] = useState(preselectedProductId || (products[0]?.id ?? ''));
  const defaultRefType =
    operationType === 'RECEIPT'
      ? 'MANUAL_RECEIPT'
      : operationType === 'ISSUE'
        ? 'MANUAL_ISSUE'
        : 'CYCLE_COUNT';

  const [quantity, setQuantity] = useState('1');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [reason, setReason] = useState('');
  const [referenceType, setReferenceType] = useState(defaultRefType);
  const [referenceId, setReferenceId] = useState('');

  interface OperationResult {
    id: string;
    movementType: string;
    quantity: string;
    balanceBefore: string;
    balanceAfter: string;
    referenceType?: string | null;
    referenceId?: string | null;
    reason: string;
    createdAt: string | Date;
  }

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<OperationResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);

    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Please provide a strictly positive quantity.');
      return;
    }

    if (!reason.trim()) {
      setError('A descriptive reason is required for this stock movement.');
      return;
    }

    // Confirmation for irreversible stock mutations
    const opLabel =
      operationType === 'RECEIPT'
        ? 'Stock Receipt'
        : operationType === 'ISSUE'
          ? 'Stock Issue'
          : `Stock Adjustment (${direction})`;

    if (!window.confirm(`Confirm execution of ${opLabel} for ${quantity} unit(s)?`)) {
      return;
    }

    setIsLoading(true);

    try {
      let url = '/api/inventory/receipts';
      let payload: Record<string, unknown> = {
        warehouseId,
        productId,
        quantity: numQty,
        reason: reason.trim(),
        referenceType: referenceType || undefined,
        referenceId: referenceId.trim() || undefined,
      };

      if (operationType === 'ISSUE') {
        url = '/api/inventory/issues';
      } else if (operationType === 'ADJUSTMENT') {
        url = '/api/inventory/adjustments';
        payload = {
          ...payload,
          direction,
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to record stock movement');
        setIsLoading(false);
      } else {
        setSuccessResult(data.data);
        setIsLoading(false);
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred while communicating with the inventory service.');
      setIsLoading(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            {operationType === 'RECEIPT' && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            )}
            {operationType === 'ISSUE' && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            )}
            {operationType === 'ADJUSTMENT' && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {operationType === 'RECEIPT' && 'Record Incoming Stock (Receipt)'}
                {operationType === 'ISSUE' && 'Issue Outgoing Stock'}
                {operationType === 'ADJUSTMENT' && 'Perform Stock Adjustment'}
              </h3>
              <p className="text-xs text-slate-500">
                Atomic append to immutable inventory movement ledger
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg leading-none"
          >
            ×
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start space-x-2.5 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successResult ? (
          <div className="my-6 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <h4 className="mt-2 text-sm font-bold text-emerald-900">
                Movement Committed Successfully
              </h4>
              <p className="mt-1 text-xs text-emerald-700">
                Movement ID: <code className="font-mono">{successResult.id}</code>
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Movement Type:</span>
                <span className="font-bold font-mono text-slate-900">
                  {successResult.movementType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity Transacted:</span>
                <span className="font-bold text-slate-900">{successResult.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Balance Before / After:</span>
                <span className="font-mono text-slate-900">
                  {successResult.balanceBefore} →{' '}
                  <strong className="text-emerald-700">{successResult.balanceAfter}</strong>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ledger Reference:</span>
                <span className="font-mono text-slate-600">{successResult.referenceId}</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setSuccessResult(null);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close & View Ledger
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="modal-warehouse"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Target Warehouse Facility *
              </label>
              <select
                id="modal-warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id} disabled={!wh.isActive}>
                    {wh.name} ({wh.code}) {!wh.isActive ? '— [Deactivated]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="modal-product"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Catalog Product *
              </label>
              <select
                id="modal-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.isArchived}>
                    {p.name} [{p.sku}] ({p.uom}) {p.isArchived ? '— [Archived]' : ''}
                  </option>
                ))}
              </select>
            </div>

            {operationType === 'ADJUSTMENT' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Adjustment Direction *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center space-x-2 rounded-lg border p-2 text-xs font-bold cursor-pointer transition ${
                      direction === 'IN'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="direction"
                      checked={direction === 'IN'}
                      onChange={() => setDirection('IN')}
                      className="sr-only"
                    />
                    <span>(+) Adjustment In (Found Stock)</span>
                  </label>
                  <label
                    className={`flex items-center justify-center space-x-2 rounded-lg border p-2 text-xs font-bold cursor-pointer transition ${
                      direction === 'OUT'
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="direction"
                      checked={direction === 'OUT'}
                      onChange={() => setDirection('OUT')}
                      className="sr-only"
                    />
                    <span>(−) Adjustment Out (Shrinkage)</span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="modal-qty"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Quantity ({selectedProduct?.uom || 'Units'}) *
                </label>
                <input
                  id="modal-qty"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="modal-ref-type"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Reference Type
                </label>
                <select
                  id="modal-ref-type"
                  value={referenceType}
                  onChange={(e) => setReferenceType(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  {operationType === 'RECEIPT' && (
                    <>
                      <option value="MANUAL_RECEIPT">Manual Stock Receipt</option>
                      <option value="PURCHASE_ORDER">Supplier Consignment</option>
                      <option value="INITIAL_STOCK">Initial Foundation Stock</option>
                      <option value="RETURN">Customer Return</option>
                    </>
                  )}
                  {operationType === 'ISSUE' && (
                    <>
                      <option value="MANUAL_ISSUE">Manual Issue</option>
                      <option value="INTERNAL_CONSUMPTION">Internal Consumption</option>
                      <option value="DAMAGE_DISPOSAL">Damage / Write-Off</option>
                      <option value="SAMPLE">Quality / Sales Sample</option>
                    </>
                  )}
                  {operationType === 'ADJUSTMENT' && (
                    <>
                      <option value="CYCLE_COUNT">Cycle Count Discrepancy</option>
                      <option value="PHYSICAL_AUDIT">Annual Physical Audit</option>
                      <option value="DATA_CORRECTION">Correction of Entry Error</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="modal-ref-id"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                External Reference # (Optional)
              </label>
              <input
                id="modal-ref-id"
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. BILL-9921, AUDIT-2026-Q1, DISP-001"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="modal-reason"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Operational Reason * (Mandatory for audit trail)
              </label>
              <textarea
                id="modal-reason"
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the cause of this stock transaction..."
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
                  operationType === 'RECEIPT'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : operationType === 'ISSUE'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Processing Transaction...' : 'Commit Movement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
