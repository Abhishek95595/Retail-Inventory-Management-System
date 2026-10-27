import React from 'react';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/backend/server/auth';
import { getCategories } from '@/backend/server/categories';
import { db } from '@/backend/db';
import { suppliers } from '@/backend/db/schema';
import { PERMISSIONS } from '@/shared/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { ProductForm } from '@/frontend/components/ProductForm';

export default async function NewProductPage() {
  let user;
  try {
    user = await requirePermission(PERMISSIONS.CATALOG_MANAGE);
  } catch {
    redirect('/products');
  }

  const categoriesList = await getCategories();
  const suppliersList = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .orderBy(suppliers.name);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Product</h1>
            <p className="text-xs text-slate-500 mt-1">
              Register master retail inventory item with pricing, barcode, and replenishment
              triggers.
            </p>
          </div>

          <ProductForm categories={categoriesList} suppliers={suppliersList} />
        </div>
      </main>
    </div>
  );
}
