import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getWarehouses } from '@/server/warehouses';
import { getProducts } from '@/server/products';
import { requirePermission } from '@/server/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import { OrderForm } from '@/components/OrderForm';
import { ShoppingCart, ChevronRight } from 'lucide-react';

export default async function NewOrderPage() {
  let user;
  try {
    user = await requireAuth();
    await requirePermission(PERMISSIONS.ORDERS_CREATE);
  } catch {
    redirect('/orders');
  }

  const [warehouses, productsResult] = await Promise.all([
    getWarehouses(),
    getProducts({ limit: 100 }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="pb-6 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/orders" className="hover:text-slate-900">
              Sales Orders
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="text-emerald-700">New Order</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Create Sales Order
              </h1>
              <p className="text-xs text-slate-500">
                Capture customer order requirements before committing stock reservations.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <OrderForm warehouses={warehouses} products={productsResult.items} />
        </div>
      </main>
    </div>
  );
}
