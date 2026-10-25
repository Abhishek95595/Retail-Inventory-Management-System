'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  PackageCheck,
  Ban,
  Boxes,
  Truck,
} from 'lucide-react';

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  status: 'DRAFT' | 'CONFIRMED' | 'PICKING' | 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
  canCreate: boolean;
  canFulfill: boolean;
  canCancel: boolean;
}

export function OrderActions({
  orderId,
  orderNumber,
  status,
  canCreate,
  canFulfill,
  canCancel,
}: OrderActionsProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAction = async (endpoint: string, actionLabel: string, confirmPrompt?: string) => {
    setError(null);
    setSuccessMsg(null);

    if (confirmPrompt && !window.confirm(confirmPrompt)) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || `Failed to ${actionLabel.toLowerCase()}.`);
        setIsLoading(false);
      } else {
        setSuccessMsg(`Order successfully updated: ${actionLabel}`);
        setIsLoading(false);
        router.refresh();
      }
    } catch {
      setError(`An error occurred while attempting to ${actionLabel.toLowerCase()}.`);
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setSuccessMsg(null);

    const reason = window.prompt(
      `Please provide an operational reason for cancelling order ${orderNumber}:`
    );

    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('Cancellation requires a reason of at least 3 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to cancel order.');
        setIsLoading(false);
      } else {
        setSuccessMsg('Sales order cancelled and any active reservations released.');
        setIsLoading(false);
        router.refresh();
      }
    } catch {
      setError('An error occurred during order cancellation.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="flex items-start space-x-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start space-x-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Step 1: CONFIRM (Reserves Stock) */}
        {status === 'DRAFT' && canCreate && (
          <button
            type="button"
            onClick={() =>
              handleAction(
                'confirm',
                'Confirmed (Stock Reserved)',
                `Confirm order ${orderNumber}? Available stock will be verified and atomically reserved.`
              )
            }
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Confirm Order & Reserve Stock'}</span>
          </button>
        )}

        {/* Step 2: PICK */}
        {status === 'CONFIRMED' && canFulfill && (
          <button
            type="button"
            onClick={() => handleAction('pick', 'Started Picking')}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition"
          >
            <Boxes className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Start Picking'}</span>
          </button>
        )}

        {/* Step 3: PACK */}
        {status === 'PICKING' && canFulfill && (
          <button
            type="button"
            onClick={() => handleAction('pack', 'Packed & Ready')}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Complete Packing'}</span>
          </button>
        )}

        {/* Step 4: DISPATCH (Deducts on_hand and clears reserved) */}
        {['CONFIRMED', 'PICKING', 'PACKED'].includes(status) && canFulfill && (
          <button
            type="button"
            onClick={() =>
              handleAction(
                'dispatch',
                'Dispatched (Shipped)',
                `Dispatch order ${orderNumber}? Stock reservations will be fulfilled and on-hand inventory consumed.`
              )
            }
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Dispatch Shipment'}</span>
          </button>
        )}

        {/* Step 5: DELIVER */}
        {status === 'DISPATCHED' && canFulfill && (
          <button
            type="button"
            onClick={() =>
              handleAction(
                'deliver',
                'Delivered',
                `Mark order ${orderNumber} as delivered? This finalizes the order workflow.`
              )
            }
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Confirm Delivery'}</span>
          </button>
        )}

        {/* Cancel Action (Draft, Confirmed, Picking, Packed) */}
        {['DRAFT', 'CONFIRMED', 'PICKING', 'PACKED'].includes(status) && canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>Cancel Order</span>
          </button>
        )}

        {status === 'DELIVERED' && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>Order Completed & Delivered</span>
          </span>
        )}

        {status === 'CANCELLED' && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200">
            <Ban className="h-4 w-4 text-slate-500" />
            <span>Order Cancelled (Reservations Released)</span>
          </span>
        )}
      </div>
    </div>
  );
}
