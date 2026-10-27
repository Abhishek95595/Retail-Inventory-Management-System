import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getCategories } from '@/server/categories';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { FolderTree, Plus, Folder, Package } from 'lucide-react';

export default async function CategoriesPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const canManage = hasPermission(user.role, PERMISSIONS.CATALOG_MANAGE);
  const categoriesList = await getCategories();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-2">
                <FolderTree className="h-3.5 w-3.5" />
                <span>Product Hierarchy</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Categories Directory
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Manage hierarchical product categories, classification codes, and nesting.
              </p>
            </div>

            {canManage && (
              <Link
                href="/categories/new"
                className="inline-flex items-center space-x-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Category</span>
              </Link>
            )}
          </div>

          {/* Categories Data Grid */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {categoriesList.length === 0 ? (
              <div className="p-12 text-center">
                <FolderTree className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-sm font-semibold text-slate-900">No categories found</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Organize your retail catalog by creating top-level categories and subcategories.
                </p>
                {canManage && (
                  <div className="mt-6">
                    <Link
                      href="/categories/new"
                      className="inline-flex items-center rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create First Category
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Category Name
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Code
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Parent Category
                      </th>
                      <th scope="col" className="px-4 py-3 text-center">
                        Product Count
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Description
                      </th>
                      {canManage && (
                        <th scope="col" className="px-4 py-3 text-right">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {categoriesList.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/75 transition">
                        <td className="px-4 py-3.5 font-medium text-slate-900">
                          <div className="flex items-center space-x-2">
                            <Folder className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">{cat.code}</td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {cat.parentName ? (
                            <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {cat.parentName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Top Level</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center space-x-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            <Package className="h-3 w-3 text-slate-400" />
                            <span>{cat.productCount}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate">
                          {cat.description || '—'}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3.5 text-right font-medium">
                            <Link
                              href={`/categories/${cat.id}/edit`}
                              className="text-emerald-600 hover:text-emerald-900 transition"
                            >
                              Edit
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
