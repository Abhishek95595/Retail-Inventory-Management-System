import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/backend/server/auth';
import { getWarehouses } from '@/backend/server/warehouses';
import { getProducts } from '@/backend/server/products';
import { requirePermission } from '@/backend/server/auth';
import { PERMISSIONS } from '@/shared/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { TransferForm } from '@/frontend/components/TransferForm';
import { ArrowLeftRight, ChevronRight } from 'lucide-react';

export default async function NewTransferPage() {
  let user;
  try {
    user = await requireAuth();
    await requirePermission(PERMISSIONS.INVENTORY_TRANSFER_MANAGE);
  } catch {
    redirect('/transfers');
  }

  const [warehouses, productsResult] = await Promise.all([
    getWarehouses(),
    getProducts({ limit: 100 }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb Header */}
        <div className="pb-6 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/transfers" className="hover:text-slate-900">
              Stock Transfers
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-emerald-700">New Transfer</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Create Stock Transfer
              </h1>
              <p className="text-xs text-slate-500">
                Initiate a new draft transfer between two active warehouse facilities.
              </p>
            </div>
          </div>
        </div>

        {/* Transfer Form Component */}
        <div className="mt-8">
          <TransferForm warehouses={warehouses} products={productsResult.items} />
        </div>
      </main>
    </div>
  );
}
