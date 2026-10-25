'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface SupplierOption {
  id: string;
  name: string;
  code: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  costPrice: string | null;
  uom: string;
}

interface PurchaseOrderFormProps {
  suppliers: SupplierOption[];
  warehouses: WarehouseOption[];
  products: ProductOption[];
  initialData?: {
    id: string;
    supplierId: string;
    destinationWarehouseId: string;
    expectedArrivalDate?: string | null;
    items: Array<{
      productId: string;
      quantityOrdered: string;
      unitCost: string;
    }>;
  };
  isEdit?: boolean;
}

export function PurchaseOrderForm({
  suppliers,
  warehouses,
  products,
  initialData,
  isEdit = false,
}: PurchaseOrderFormProps) {
  const router = useRouter();

  const [supplierId, setSupplierId] = useState(initialData?.supplierId || (suppliers[0]?.id ?? ''));
  const [destinationWarehouseId, setDestinationWarehouseId] = useState(
    initialData?.destinationWarehouseId || (warehouses[0]?.id ?? '')
  );
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(
    initialData?.expectedArrivalDate ? initialData.expectedArrivalDate.slice(0, 10) : ''
  );

  const [lines, setLines] = useState<
    Array<{ productId: string; quantityOrdered: string; unitCost: string }>
  >(
    initialData?.items?.length
      ? initialData.items.map((i) => ({
          productId: i.productId,
          quantityOrdered: i.quantityOrdered,
          unitCost: i.unitCost,
        }))
      : products[0]
        ? [
            {
              productId: products[0].id,
              quantityOrdered: '10.00',
              unitCost: products[0].costPrice ? Number(products[0].costPrice).toFixed(4) : '0.0000',
            },
          ]
        : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    const updated = [...lines];
    updated[index] = {
      ...updated[index],
      productId: newProductId,
      unitCost: prod?.costPrice ? Number(prod.costPrice).toFixed(4) : '0.0000',
    };
    setLines(updated);
  };

  const handleQuantityChange = (index: number, qty: string) => {
    const updated = [...lines];
    updated[index].quantityOrdered = qty;
    setLines(updated);
  };

  const handleCostChange = (index: number, cost: string) => {
    const updated = [...lines];
    updated[index].unitCost = cost;
    setLines(updated);
  };

  const addLine = () => {
    const availableProds = products.filter((p) => !lines.some((l) => l.productId === p.id));
    const nextProd = availableProds[0] || products[0];
    if (!nextProd) return;

    setLines([
      ...lines,
      {
        productId: nextProd.id,
        quantityOrdered: '1.00',
        unitCost: nextProd.costPrice ? Number(nextProd.costPrice).toFixed(4) : '0.0000',
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const calculateSubtotal = () => {
    return lines
      .reduce((sum, line) => {
        const q = Number(line.quantityOrdered) || 0;
        const c = Number(line.unitCost) || 0;
        return sum + q * c;
      }, 0)
      .toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        supplierId,
        destinationWarehouseId,
        expectedArrivalDate: expectedArrivalDate || null,
        items: lines.map((l) => ({
          productId: l.productId,
          quantityOrdered: Number(l.quantityOrdered),
          unitCost: Number(l.unitCost),
        })),
      };

      const url = isEdit ? `/api/purchase-orders/${initialData?.id}` : '/api/purchase-orders';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save purchase order');
      }

      router.push(`/purchasing/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Order Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Supplier <span className="text-rose-500">*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Destination Warehouse <span className="text-rose-500">*</span>
            </label>
            <select
              value={destinationWarehouseId}
              onChange={(e) => setDestinationWarehouseId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Expected Arrival Date
            </label>
            <input
              type="date"
              value={expectedArrivalDate}
              onChange={(e) => setExpectedArrivalDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Purchase Order Line Items</h2>
            <p className="text-xs text-slate-500">
              Snapshot unit costs from catalog or customize agreed supplier cost.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            disabled={lines.length >= products.length}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-sm"
          >
            <Plus className="h-4 w-4 text-slate-600" />
            <span>Add Item Line</span>
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => {
            const lineTotal = (
              (Number(line.quantityOrdered) || 0) * (Number(line.unitCost) || 0)
            ).toFixed(2);

            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/50"
              >
                <div className="w-full sm:flex-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Product
                  </label>
                  <select
                    value={line.productId}
                    onChange={(e) => handleProductChange(idx, e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {p.uom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-32">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Qty Ordered
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={line.quantityOrdered}
                    onChange={(e) => handleQuantityChange(idx, e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="w-full sm:w-36">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={line.unitCost}
                    onChange={(e) => handleCostChange(idx, e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="w-full sm:w-28 text-right sm:self-end sm:pb-2">
                  <span className="text-xs text-slate-500 block sm:hidden">Total:</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">${lineTotal}</span>
                </div>

                <div className="sm:self-end sm:pb-1">
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition rounded"
                    title="Remove Line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 pt-4 flex justify-end">
          <div className="text-right space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Estimated Cost
            </span>
            <p className="text-2xl font-black text-slate-900 font-mono">${calculateSubtotal()}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Link
          href={isEdit ? `/purchasing/${initialData?.id}` : '/purchasing'}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Cancel & Return</span>
        </Link>

        <button
          type="submit"
          disabled={loading || lines.length === 0}
          className="flex items-center space-x-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>{isEdit ? 'Save Draft Updates' : 'Create Purchase Order Draft'}</span>
        </button>
      </div>
    </form>
  );
}
