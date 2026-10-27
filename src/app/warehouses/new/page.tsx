import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/server/auth';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { WarehouseForm } from '@/frontend/components/WarehouseForm';

export default async function NewWarehousePage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const canManage = hasPermission(user.role, PERMISSIONS.WAREHOUSE_MANAGE);
  if (!canManage) {
    redirect('/warehouses');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Warehouses</span>
            <span>/</span>
            <span className="text-emerald-700">New Facility</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Register Storage Facility
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Define warehouse identification code, physical location, and contact parameters.
          </p>
        </div>

        <WarehouseForm isEdit={false} />
      </main>
    </div>
  );
}
