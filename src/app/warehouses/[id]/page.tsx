import React from 'react';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getWarehouseById } from '@/server/warehouses';
import { getInventoryBalances } from '@/server/inventory';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { WarehouseActions } from '@/frontend/components/WarehouseActions';
import {
  ArrowLeft,
  Edit,
  MapPin,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';

export default async function WarehouseDetailPage({ params }: { params: { id: string } }) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const warehouse = await getWarehouseById(params.id);
  if (!warehouse) {
    notFound();
  }

  const canManage = hasPermission(user.role, PERMISSIONS.WAREHOUSE_MANAGE);

  // Retrieve inventory balances in this warehouse
  const balancesResult = await getInventoryBalances({
    warehouseId: warehouse.id,
    limit: 50,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              href="/warehouses"
              className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Warehouses</span>
            </Link>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {warehouse.name}
              </h1>
              <span
                className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  warehouse.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {warehouse.isActive ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Active Facility</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-slate-400" />
                    <span>Deactivated</span>
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs font-bold text-slate-500 uppercase tracking-wider">
              FACILITY CODE: {warehouse.code}
            </p>
          </div>

          {canManage && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link
                href={`/warehouses/${warehouse.id}/edit`}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                <Edit className="h-3.5 w-3.5 text-slate-500" />
                <span>Edit Details</span>
              </Link>
              <WarehouseActions
                warehouse={{
                  id: warehouse.id,
                  name: warehouse.name,
                  code: warehouse.code,
                  isActive: warehouse.isActive,
                }}
              />
            </div>
          )}
        </div>

        {/* Facility Info Card & Capacity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
              Facility Information
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Physical Address</p>
                  <p className="text-slate-600 mt-0.5">
                    {warehouse.address || 'No physical address configured'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <Phone className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Contact Number</p>
                  <p className="text-slate-600 mt-0.5">
                    {warehouse.contactPhone || 'No contact phone recorded'}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Registration Date</p>
                  <p className="text-slate-600 mt-0.5">
                    {new Date(warehouse.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                Storage & Inventory Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="bg-slate-50 p-3.5 rounded-lg text-center border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Products Stocked
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{warehouse.productCount}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-lg text-center border border-slate-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    On-Hand Units
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {parseFloat(warehouse.totalOnHand).toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-lg text-center border border-emerald-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Available Units
                  </p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {parseFloat(warehouse.totalAvailable).toLocaleString()}
                  </p>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-lg text-center border border-amber-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Reserved / Quarantined
                  </p>
                  <p className="text-xl font-bold text-amber-900 mt-1">
                    {(
                      parseFloat(warehouse.totalReserved) + parseFloat(warehouse.totalQuarantined)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Database Invariant: Available = On-Hand − Reserved − Quarantined</span>
              <span>
                Last inventory refresh: {new Date(warehouse.updatedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Live Inventory Balances Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Current Facility Inventory Balances
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact stock levels recorded at this specific storage location.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href={`/inventory/movements?warehouseId=${warehouse.id}`}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
              >
                View Facility Movement History
              </Link>
              <Link
                href={`/inventory?warehouseId=${warehouse.id}`}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Open in Inventory Matrix →
              </Link>
            </div>
          </div>

          {balancesResult.items.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto h-10 w-10 text-slate-300" />
              <h4 className="mt-2 text-sm font-bold text-slate-900">No stock balances found</h4>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                No inventory records currently exist at {warehouse.name}. Balance entries will
                appear here as inventory receipts are processed in Phase 6.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Product Name & SKU
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Category
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      On-Hand Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Reserved Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Quarantined Qty
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-bold text-emerald-800">
                      Available Qty
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {balancesResult.items.map((bal) => (
                    <tr key={bal.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <Link
                          href={`/products/${bal.productId}`}
                          className="hover:text-emerald-600 hover:underline"
                        >
                          {bal.productName}
                        </Link>
                        <span className="block font-mono text-[10px] text-slate-500 uppercase">
                          {bal.sku}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {bal.categoryName || 'Uncategorized'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-900 font-semibold">
                        {parseFloat(bal.onHandQty).toLocaleString()} {bal.uom}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-700">
                        {parseFloat(bal.reservedQty).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">
                        {parseFloat(bal.quarantinedQty).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                        {parseFloat(bal.availableQty).toLocaleString()} {bal.uom}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(bal.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
