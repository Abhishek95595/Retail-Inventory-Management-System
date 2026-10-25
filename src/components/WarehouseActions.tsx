'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Power, Trash2, AlertCircle } from 'lucide-react';

interface WarehouseActionsProps {
  warehouse: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  };
}

export function WarehouseActions({ warehouse }: WarehouseActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleStatus = async () => {
    const nextStatus = !warehouse.isActive;
    const confirmMessage = nextStatus
      ? `Are you sure you want to reactivate warehouse facility ${warehouse.name} (${warehouse.code})?`
      : `Are you sure you want to deactivate warehouse facility ${warehouse.name} (${warehouse.code})? Deactivated facilities remain in historical records but new inventory receiving may be restricted.`;

    if (!window.confirm(confirmMessage)) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/warehouses/${warehouse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update warehouse status');
        setIsLoading(false);
      } else {
        router.refresh();
        setIsLoading(false);
      }
    } catch {
      setError('An unexpected error occurred while toggling warehouse operational status.');
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete warehouse ${warehouse.name} (${warehouse.code})? This will fail if inventory balances or historical transfers reference this facility.`
      )
    ) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/warehouses/${warehouse.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to delete warehouse');
        setIsLoading(false);
      } else {
        router.push('/warehouses');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred while attempting to delete the warehouse.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="flex items-start space-x-2.5 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <button
          onClick={handleToggleStatus}
          disabled={isLoading}
          className={`inline-flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
            warehouse.isActive
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          <Power className="h-3.5 w-3.5" />
          <span>{warehouse.isActive ? 'Deactivate Facility' : 'Reactivate Facility'}</span>
        </button>

        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="inline-flex items-center space-x-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 shadow-sm transition disabled:opacity-50"
          title="Delete facility if no dependencies exist"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
          <span>Delete Facility</span>
        </button>
      </div>
    </div>
  );
}
