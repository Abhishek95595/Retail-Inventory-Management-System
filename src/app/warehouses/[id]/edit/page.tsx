import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { requireAuth } from '@/server/auth';
import { getWarehouseById } from '@/server/warehouses';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import { WarehouseForm } from '@/components/WarehouseForm';

export default async function EditWarehousePage({ params }: { params: { id: string } }) {
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

  const warehouse = await getWarehouseById(params.id);
  if (!warehouse) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Warehouses</span>
            <span>/</span>
            <span>{warehouse.name}</span>
            <span>/</span>
            <span className="text-emerald-700">Edit Facility</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Edit Storage Facility
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Update identification code, contact numbers, and operational status.
          </p>
        </div>

        <WarehouseForm
          initialData={{
            id: warehouse.id,
            code: warehouse.code,
            name: warehouse.name,
            address: warehouse.address,
            contactPhone: warehouse.contactPhone,
            isActive: warehouse.isActive,
          }}
          isEdit={true}
        />
      </main>
    </div>
  );
}
