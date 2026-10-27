'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ShoppingCart, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { formatINR } from '@/shared/currency';

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
  sellingPrice: string;
  isArchived: boolean;
}

interface OrderFormProps {
  warehouses: WarehouseOption[];
  products: ProductOption[];
  initialWarehouseId?: string;
}

export function OrderForm({ warehouses, products, initialWarehouseId }: OrderFormProps) {
  const router = useRouter();

  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const activeProducts = products.filter((p) => !p.isArchived);

  const [warehouseId, setWarehouseId] = useState(
    initialWarehouseId || activeWarehouses[0]?.id || ''
  );
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [items, setItems] = useState<
    Array<{ productId: string; quantity: string; unitPrice: string }>
  >([
    {
      productId: activeProducts[0]?.id || '',
      quantity: '1',
      unitPrice: activeProducts[0]?.sellingPrice || '0.0000',
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    const usedIds = new Set(items.map((i) => i.productId));
    const available = activeProducts.find((p) => !usedIds.has(p.id));
    if (!available) {
      setError('All catalog products are already added to this order.');
      return;
    }
    setItems([
      ...items,
      { productId: available.id, quantity: '1', unitPrice: available.sellingPrice },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('An order must contain at least one product item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, pId: string) => {
    setError(null);
    const prod = activeProducts.find((p) => p.id === pId);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: pId,
      unitPrice: prod?.sellingPrice || '0.0000',
    };
    setItems(updated);
  };

  const handleItemChange = (index: number, field: 'quantity' | 'unitPrice', val: string) => {
    setError(null);
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Calculate order subtotal live
  const calculateTotal = () => {
    return items
      .reduce((sum, it) => {
        const q = parseFloat(it.quantity) || 0;
        const p = parseFloat(it.unitPrice) || 0;
        return sum + q * p;
      }, 0)
      .toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (items.length === 0) {
      setError('At least one product line item is required.');
      return;
    }

    const pIds = items.map((i) => i.productId);
    if (new Set(pIds).size !== pIds.length) {
      setError('Duplicate product items found. Please consolidate quantities into a single row.');
      return;
    }

    for (const item of items) {
      const q = parseFloat(item.quantity);
      if (isNaN(q) || q <= 0) {
        setError('Every line item must have a quantity strictly greater than zero.');
        return;
      }
      const p = parseFloat(item.unitPrice);
      if (isNaN(p) || p < 0) {
        setError('Unit price cannot be negative.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim() || undefined,
          items: items.map((i) => ({
            productId: i.productId,
            quantity: parseFloat(i.quantity),
            unitPrice: parseFloat(i.unitPrice),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create sales order.');
        setIsLoading(false);
      } else {
        router.push(`/orders/${data.data.id}`);
      }
    } catch {
      setError('An unexpected error occurred while saving the sales order.');
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

      {/* Customer & Fulfillment Warehouse */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          Order & Fulfillment Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="customer-name" className="block text-xs font-semibold text-slate-700">
              Customer Name *
            </label>
            <input
              id="customer-name"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Acme Retail Store"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="customer-email" className="block text-xs font-semibold text-slate-700">
              Customer Email Address
            </label>
            <input
              id="customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="purchasing@acme.com"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="fulfillment-warehouse"
              className="block text-xs font-semibold text-slate-700"
            >
              Fulfillment Facility *
            </label>
            <select
              id="fulfillment-warehouse"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {activeWarehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Order Line Items */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Order Line Items
            </h3>
            <p className="text-xs text-slate-500">
              Products to allocate and reserve upon order confirmation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const selectedProd = activeProducts.find((p) => p.id === item.productId);
            const lineTotal = (
              (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
            ).toFixed(2);

            return (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3"
              >
                <div className="flex-1">
                  <label
                    htmlFor={`order-item-prod-${index}`}
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    Catalog Product
                  </label>
                  <select
                    id={`order-item-prod-${index}`}
                    value={item.productId}
                    onChange={(e) => handleProductSelect(index, e.target.value)}
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

                <div className="w-28">
                  <label
                    htmlFor={`order-item-qty-${index}`}
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    Qty ({selectedProd?.uom || 'Units'})
                  </label>
                  <input
                    id={`order-item-qty-${index}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="w-32">
                  <label
                    htmlFor={`order-item-price-${index}`}
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1"
                  >
                    Unit Price (₹)
                  </label>
                  <input
                    id={`order-item-price-${index}`}
                    type="number"
                    step="0.0001"
                    min="0"
                    required
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 font-mono bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="w-24 text-right">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Line Total
                  </span>
                  <p className="font-mono font-bold text-xs text-slate-900 pt-2">
                    {formatINR(lineTotal)}
                  </p>
                </div>

                <div className="pt-5 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length <= 1}
                    className="rounded-lg p-2 text-slate-400 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Remove Item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <div className="text-right">
            <span className="text-xs text-slate-500">Estimated Total Amount:</span>
            <p className="text-xl font-mono font-bold text-slate-900">
              {formatINR(calculateTotal())}
            </p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/orders"
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
          <ShoppingCart className="h-4 w-4" />
          <span>{isLoading ? 'Creating Draft Order...' : 'Create Draft Order'}</span>
        </button>
      </div>
    </form>
  );
}
