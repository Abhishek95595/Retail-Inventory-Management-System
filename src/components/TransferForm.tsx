'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeftRight, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface WarehouseOption {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
  isArchived: boolean;
}

interface TransferFormProps {
  warehouses: WarehouseOption[];
  products: ProductOption[];
  initialSourceWarehouseId?: string;
}

export function TransferForm({
  warehouses,
  products,
  initialSourceWarehouseId,
}: TransferFormProps) {
  const router = useRouter();

  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const activeProducts = products.filter((p) => !p.isArchived);

  const [sourceWarehouseId, setSourceWarehouseId] = useState(
    initialSourceWarehouseId || activeWarehouses[0]?.id || ''
  );
  const [destinationWarehouseId, setDestinationWarehouseId] = useState(
    activeWarehouses.find((w) => w.id !== (initialSourceWarehouseId || activeWarehouses[0]?.id))
      ?.id || ''
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: activeProducts[0]?.id || '', quantity: '1' },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    // Find first unused product
    const usedIds = new Set(items.map((i) => i.productId));
    const available = activeProducts.find((p) => !usedIds.has(p.id));
    if (!available) {
      setError('All catalog products are already added to this transfer.');
      return;
    }
    setItems([...items, { productId: available.id, quantity: '1' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('A transfer must contain at least one product item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', value: string) => {
    setError(null);
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sourceWarehouseId === destinationWarehouseId) {
      setError('Source and destination warehouses must be different facilities.');
      return;
    }

    if (items.length === 0) {
      setError('At least one product line item is required.');
      return;
    }

    // Check duplicate products
    const pIds = items.map((i) => i.productId);
    if (new Set(pIds).size !== pIds.length) {
      setError('Duplicate product items found. Please consolidate quantities into a single row.');
      return;
    }

    // Validate quantities
    for (const item of items) {
      const q = parseFloat(item.quantity);
      if (isNaN(q) || q <= 0) {
        setError('Every line item must have a quantity strictly greater than zero.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWarehouseId,
          destinationWarehouseId,
          notes: notes.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: parseFloat(i.quantity),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create transfer.');
        setIsLoading(false);
      } else {
        router.push(`/transfers/${data.data.id}`);
      }
    } catch {
      setError('An unexpected error occurred while saving the transfer.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start space-x-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Facilities Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          Transfer Route Facilities
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="source-warehouse"
              className="block text-xs font-semibold text-slate-700"
            >
              Source Facility (Origin Warehouse) *
            </label>
            <select
              id="source-warehouse"
              value={sourceWarehouseId}
              onChange={(e) => setSourceWarehouseId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {activeWarehouses.map((wh) => (
                <option key={wh.id} value={wh.id} disabled={wh.id === destinationWarehouseId}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Stock will be deducted from this warehouse upon dispatch.
            </p>
          </div>

          <div>
            <label
              htmlFor="destination-warehouse"
              className="block text-xs font-semibold text-slate-700"
            >
              Destination Facility (Receiving Warehouse) *
            </label>
            <select
              id="destination-warehouse"
              value={destinationWarehouseId}
              onChange={(e) => setDestinationWarehouseId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {activeWarehouses.map((wh) => (
                <option key={wh.id} value={wh.id} disabled={wh.id === sourceWarehouseId}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Stock will be credited to this warehouse upon confirmed receipt.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="transfer-notes" className="block text-xs font-semibold text-slate-700">
            Logistics Notes / Operational Reason
          </label>
          <textarea
            id="transfer-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Stock rebalancing for peak holiday season demand"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Line Items Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Transfer Line Items
            </h3>
            <p className="text-xs text-slate-500">
              Select products and positive transfer quantities.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Product</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const selectedProd = activeProducts.find((p) => p.id === item.productId);
            return (
              <div
                key={index}
                className="flex items-center space-x-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
              >
                <div className="flex-1">
                  <label
                    htmlFor={`item-product-${index}`}
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    Catalog Product
                  </label>
                  <select
                    id={`item-product-${index}`}
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 bg-white focus:border-emerald-500 focus:outline-none"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.sku}] ({p.uom})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-36">
                  <label
                    htmlFor={`item-qty-${index}`}
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    Quantity ({selectedProd?.uom || 'Units'})
                  </label>
                  <input
                    id={`item-qty-${index}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="pt-5">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    className="rounded-lg p-2 text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Remove Line Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/transfers"
          className="inline-flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Cancel & Return</span>
        </Link>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          <ArrowLeftRight className="h-4 w-4" />
          <span>{isLoading ? 'Creating Draft Transfer...' : 'Save Draft Transfer'}</span>
        </button>
      </div>
    </form>
  );
}
