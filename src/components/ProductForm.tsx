'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';

interface ProductFormProps {
  initialData?: {
    id?: string;
    sku: string;
    barcode?: string | null;
    name: string;
    description?: string | null;
    categoryId: string;
    preferredSupplierId?: string | null;
    brand?: string | null;
    uom: string;
    costPrice: string;
    sellingPrice: string;
    reorderPoint: string;
    reorderQuantity: string;
    imageUrl?: string | null;
    isArchived?: boolean;
  };
  categories: Array<{ id: string; name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  isEdit?: boolean;
}

export function ProductForm({
  initialData,
  categories,
  suppliers,
  isEdit = false,
}: ProductFormProps) {
  const router = useRouter();

  const [sku, setSku] = useState(initialData?.sku || '');
  const [barcode, setBarcode] = useState(initialData?.barcode || '');
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [preferredSupplierId, setPreferredSupplierId] = useState(
    initialData?.preferredSupplierId || ''
  );
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [uom, setUom] = useState(initialData?.uom || 'EACH');
  const [costPrice, setCostPrice] = useState(
    initialData ? parseFloat(initialData.costPrice).toString() : '0'
  );
  const [sellingPrice, setSellingPrice] = useState(
    initialData ? parseFloat(initialData.sellingPrice).toString() : '0'
  );
  const [reorderPoint, setReorderPoint] = useState(
    initialData ? parseFloat(initialData.reorderPoint).toString() : '0'
  );
  const [reorderQuantity, setReorderQuantity] = useState(
    initialData ? parseFloat(initialData.reorderQuantity).toString() : '0'
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [isArchived, setIsArchived] = useState(initialData?.isArchived || false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const payload = {
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim() || null,
      name: name.trim(),
      description: description.trim() || null,
      categoryId,
      preferredSupplierId: preferredSupplierId || null,
      brand: brand.trim() || null,
      uom: uom.trim().toUpperCase(),
      costPrice: parseFloat(costPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      reorderPoint: parseFloat(reorderPoint) || 0,
      reorderQuantity: parseFloat(reorderQuantity) || 0,
      imageUrl: imageUrl.trim() || null,
      ...(isEdit ? { isArchived } : {}),
    };

    try {
      const url = isEdit ? `/api/products/${initialData?.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save product');
        setIsLoading(false);
      } else {
        router.push('/products');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred while saving the product.');
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm max-w-3xl">
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start space-x-3 rounded-lg bg-red-50 p-3.5 text-xs text-red-800 border border-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Product Information */}
        <div className="border-b border-slate-100 pb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
            1. Core Catalog Identification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sku"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Product SKU * (Unique)
              </label>
              <input
                id="sku"
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. LAPTOP-PRO-16"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono uppercase focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Alphanumeric characters, hyphens or underscores (3-50 chars).
              </p>
            </div>

            <div>
              <label
                htmlFor="barcode"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Barcode / UPC (Optional)
              </label>
              <input
                id="barcode"
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.trim())}
                placeholder="e.g. 890123456789"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Product Title / Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Apple MacBook Pro 16-inch M3"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Categorization & Supplier */}
        <div className="border-b border-slate-100 pb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
            2. Categorization & Hierarchy
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="categoryId"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Category *
              </label>
              <select
                id="categoryId"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                disabled={isLoading}
              >
                <option value="">Select a Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="preferredSupplierId"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Preferred Supplier (Optional)
              </label>
              <select
                id="preferredSupplierId"
                value={preferredSupplierId}
                onChange={(e) => setPreferredSupplierId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                disabled={isLoading}
              >
                <option value="">None Specified</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="brand"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Brand / Manufacturer (Optional)
              </label>
              <input
                id="brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Apple, Sony, Dell"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="uom"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Unit of Measure (UOM) *
              </label>
              <select
                id="uom"
                value={uom}
                onChange={(e) => setUom(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                disabled={isLoading}
              >
                <option value="EACH">EACH (Piece / Unit)</option>
                <option value="KG">KILOGRAM (Kg)</option>
                <option value="METER">METER (m)</option>
                <option value="LITER">LITER (L)</option>
                <option value="BOX">BOX / PACK</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pricing & Replenishment Parameters */}
        <div className="border-b border-slate-100 pb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
            3. Financials & Replenishment Thresholds
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="costPrice"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Cost Price ($) *
              </label>
              <input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="sellingPrice"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Selling Price ($) *
              </label>
              <input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono font-semibold focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="reorderPoint"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Reorder Point *
              </label>
              <input
                id="reorderPoint"
                type="number"
                step="1"
                min="0"
                required
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="reorderQuantity"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
              >
                Reorder Qty *
              </label>
              <input
                id="reorderQuantity"
                type="number"
                step="1"
                min="0"
                required
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Media & Operational Status */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="imageUrl"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Product Image URL (Optional HTTPS)
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.example.com/products/laptop.jpg"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
            >
              Product Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed technical specifications, packaging notes..."
              className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              disabled={isLoading}
            />
          </div>

          {isEdit && (
            <div className="flex items-center space-x-2 pt-2">
              <input
                id="isArchived"
                type="checkbox"
                checked={isArchived}
                onChange={(e) => setIsArchived(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <label htmlFor="isArchived" className="text-xs font-semibold text-slate-700">
                Archive this product (Soft-deactivate from active catalog operations)
              </label>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100">
          <Link
            href="/products"
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Cancel</span>
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
