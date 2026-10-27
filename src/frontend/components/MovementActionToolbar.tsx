'use client';

import React, { useState } from 'react';
import { MovementModal } from './MovementModal';
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from 'lucide-react';

interface MovementActionToolbarProps {
  warehouses: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  products: Array<{ id: string; name: string; sku: string; uom: string; isArchived: boolean }>;
  canReceive: boolean;
  canIssue: boolean;
  canAdjust: boolean;
  preselectedWarehouseId?: string;
  preselectedProductId?: string;
}

export function MovementActionToolbar({
  warehouses,
  products,
  canReceive,
  canIssue,
  canAdjust,
  preselectedWarehouseId,
  preselectedProductId,
}: MovementActionToolbarProps) {
  const [modalType, setModalType] = useState<'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | null>(null);

  if (!canReceive && !canIssue && !canAdjust) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canReceive && (
          <button
            onClick={() => setModalType('RECEIPT')}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>Stock Receipt</span>
          </button>
        )}

        {canIssue && (
          <button
            onClick={() => setModalType('ISSUE')}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Stock Issue</span>
          </button>
        )}

        {canAdjust && (
          <button
            onClick={() => setModalType('ADJUSTMENT')}
            className="inline-flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Stock Adjustment</span>
          </button>
        )}
      </div>

      {modalType && (
        <MovementModal
          isOpen={true}
          onClose={() => setModalType(null)}
          operationType={modalType}
          warehouses={warehouses}
          products={products}
          preselectedWarehouseId={preselectedWarehouseId}
          preselectedProductId={preselectedProductId}
        />
      )}
    </>
  );
}
