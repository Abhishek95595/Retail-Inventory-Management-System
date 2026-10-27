'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, AlertCircle, Send, PackageCheck, Ban } from 'lucide-react';

interface TransferActionsProps {
  transferId: string;
  transferNumber: string;
  status: 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
  canDispatch: boolean;
  canReceive: boolean;
  canCancel: boolean;
}

export function TransferActions({
  transferId,
  transferNumber,
  status,
  canDispatch,
  canReceive,
  canCancel,
}: TransferActionsProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleDispatch = async () => {
    setError(null);
    setSuccessMsg(null);

    if (
      !window.confirm(
        `Confirm DISPATCH of transfer ${transferNumber}? Stock will be atomically deducted from source warehouse balances.`
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/transfers/${transferId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to dispatch transfer.');
        setIsLoading(false);
      } else {
        setSuccessMsg('Transfer dispatched successfully! Items are now in transit.');
        setIsLoading(false);
        router.refresh();
      }
    } catch {
      setError('An error occurred during dispatch communication.');
      setIsLoading(false);
    }
  };

  const handleReceive = async () => {
    setError(null);
    setSuccessMsg(null);

    if (
      !window.confirm(
        `Confirm RECEIPT of transfer ${transferNumber}? Stock will be credited to destination warehouse balances.`
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/transfers/${transferId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to receive transfer.');
        setIsLoading(false);
      } else {
        setSuccessMsg('Transfer received successfully! Items credited to destination balances.');
        setIsLoading(false);
        router.refresh();
      }
    } catch {
      setError('An error occurred during receipt communication.');
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setSuccessMsg(null);

    const reason = window.prompt(
      `Please provide an operational reason for cancelling draft transfer ${transferNumber}:`
    );

    if (reason === null) return;
    if (reason.trim().length < 3) {
      setError('Cancellation requires a reason of at least 3 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/transfers/${transferId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to cancel transfer.');
        setIsLoading(false);
      } else {
        setSuccessMsg('Draft transfer cancelled.');
        setIsLoading(false);
        router.refresh();
      }
    } catch {
      setError('An error occurred during cancellation communication.');
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
        {status === 'DRAFT' && canDispatch && (
          <button
            type="button"
            onClick={handleDispatch}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Dispatch Transfer (Ship)'}</span>
          </button>
        )}

        {status === 'DISPATCHED' && canReceive && (
          <button
            type="button"
            onClick={handleReceive}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            <PackageCheck className="h-3.5 w-3.5" />
            <span>{isLoading ? 'Processing...' : 'Confirm Receipt (Deposit)'}</span>
          </button>
        )}

        {status === 'DRAFT' && canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>Cancel Transfer</span>
          </button>
        )}

        {status === 'RECEIVED' && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-900 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span>Transfer Fully Completed & Audited</span>
          </span>
        )}

        {status === 'CANCELLED' && (
          <span className="inline-flex items-center space-x-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200">
            <XCircle className="h-4 w-4 text-slate-500" />
            <span>Transfer Cancelled (No Inventory Moved)</span>
          </span>
        )}
      </div>
    </div>
  );
}
