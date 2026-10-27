import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { requirePermission } from '@/server/auth';
import { getCategories, getCategoryById } from '@/server/categories';
import { PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { CategoryForm } from '@/frontend/components/CategoryForm';

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  let user;
  try {
    user = await requirePermission(PERMISSIONS.CATALOG_MANAGE);
  } catch {
    redirect('/categories');
  }

  const category = await getCategoryById(params.id);
  if (!category) {
    notFound();
  }

  const existingCategories = await getCategories();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Category: {category.name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Update classification code, description, or parent category hierarchy.
            </p>
          </div>

          <CategoryForm
            isEdit={true}
            initialData={category}
            availableParents={existingCategories}
          />
        </div>
      </main>
    </div>
  );
}
