import React from 'react';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/backend/server/auth';
import { getCategories } from '@/backend/server/categories';
import { PERMISSIONS } from '@/shared/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { CategoryForm } from '@/frontend/components/CategoryForm';

export default async function NewCategoryPage() {
  let user;
  try {
    user = await requirePermission(PERMISSIONS.CATALOG_MANAGE);
  } catch {
    redirect('/categories');
  }

  const existingCategories = await getCategories();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create New Category
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Add a product classification node with unique code and optional hierarchy nesting.
            </p>
          </div>

          <CategoryForm availableParents={existingCategories} />
        </div>
      </main>
    </div>
  );
}
