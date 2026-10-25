import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { requirePermission } from '@/server/auth';
import { getProductById } from '@/server/products';
import { getCategories } from '@/server/categories';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import { ProductForm } from '@/components/ProductForm';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  let user;
  try {
    user = await requirePermission(PERMISSIONS.CATALOG_MANAGE);
  } catch {
    redirect('/products');
  }

  const product = await getProductById(params.id);
  if (!product) {
    notFound();
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Product: {product.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Update SKU, pricing, unit of measure, or archive status.
            </p>
          </div>

          <ProductForm
            isEdit={true}
            initialData={product}
            categories={categoriesList}
            suppliers={suppliersList}
          />
        </div>
      </main>
    </div>
  );
}
