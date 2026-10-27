'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Save } from 'lucide-react';

interface WarehouseFormProps {
  initialData?: {
    id?: string;
    code: string;
    name: string;
    address?: string | null;
    contactPhone?: string | null;
    isActive?: boolean;
  };
  isEdit?: boolean;
}

export function WarehouseForm({ initialData, isEdit = false }: WarehouseFormProps) {
  const router = useRouter();

  const [code, setCode] = useState(initialData?.code || '');
  const [name, setName] = useState(initialData?.name || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [contactPhone, setContactPhone] = useState(initialData?.contactPhone || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      address: address.trim() || null,
      contactPhone: contactPhone.trim() || null,
      isActive,
    };

    try {
      const url = isEdit ? `/api/warehouses/${initialData?.id}` : '/api/warehouses';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to save warehouse');
        setIsLoading(false);
      } else {
        router.push(isEdit ? `/warehouses/${initialData?.id}` : '/warehouses');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred while saving the warehouse.');
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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="code"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Warehouse Facility Code * (Unique)
          </label>
          <input
            id="code"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. WH-EAST-01, NYC-DIST"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono uppercase"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            2–30 alphanumeric characters, hyphens or underscores.
          </p>
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Warehouse Facility Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Northeast Regional Distribution Center"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Physical Address
          </label>
          <textarea
            id="address"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Logistics Blvd, Dock 4B, Newark, NJ 07114"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label
            htmlFor="contactPhone"
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
          >
            Contact Phone Number
          </label>
          <input
            id="contactPhone"
            type="text"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="e.g. +1 (555) 234-5678"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {isEdit && (
          <div className="pt-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Facility Operational (Active)
              </span>
            </label>
            <p className="mt-1 text-[11px] text-slate-500 ml-6.5">
              Deactivated facilities remain accessible for historical queries, but restrictions may
              apply to new inventory receipts.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link
            href={isEdit ? `/warehouses/${initialData?.id}` : '/warehouses'}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Cancel</span>
          </Link>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            <span>
              {isLoading ? 'Saving Facility...' : isEdit ? 'Update Warehouse' : 'Create Warehouse'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
