'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';

interface CategoryFormProps {
  initialData?: {
    id?: string;
    name: string;
    code: string;
    description?: string | null;
    parentId?: string | null;
  };
  availableParents: Array<{ id: string; name: string; code: string }>;
  isEdit?: boolean;
}

export function CategoryForm({ initialData, availableParents, isEdit = false }: CategoryFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [parentId, setParentId] = useState(initialData?.parentId || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      parentId: parentId || null,
    };

    try {
      const url = isEdit ? `/api/categories/${initialData?.id}` : '/api/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save category');
        setIsLoading(false);
      } else {
        router.push('/categories');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred while saving the category.');
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm max-w-2xl">
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
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Category Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Consumer Electronics"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="code"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Category Code * (Unique Identifier)
          </label>
          <input
            id="code"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ELEC-CONSUMER"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm font-mono uppercase focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            disabled={isLoading}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            2-30 characters, uppercase letters, numbers, hyphens or underscores.
          </p>
        </div>

        <div>
          <label
            htmlFor="parentId"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Parent Category (Optional)
          </label>
          <select
            id="parentId"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
            disabled={isLoading}
          >
            <option value="">None (Top-Level Category)</option>
            {availableParents
              .filter((p) => p.id !== initialData?.id) // Cannot select self
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Hierarchy cycles (assigning a category under its own subcategories) are automatically
            rejected.
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief operational notes or categorization details..."
            className="mt-1.5 block w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link
            href="/categories"
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
            <span>{isLoading ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
