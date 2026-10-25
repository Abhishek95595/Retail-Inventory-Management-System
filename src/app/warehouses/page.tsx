import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireAuth } from '@/server/auth';
import { getWarehouses, WarehouseFilters } from '@/server/warehouses';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import {
  Warehouse,
  Plus,
  Search,
  ChevronRight,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface WarehousesPageProps {
  searchParams: {
    search?: string;
    isActive?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

export default async function WarehousesPage({ searchParams }: WarehousesPageProps) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const canManage = hasPermission(user.role, PERMISSIONS.WAREHOUSE_MANAGE);

  const search = searchParams.search || '';
  const isActive =
    searchParams.isActive !== undefined ? searchParams.isActive === 'true' : undefined;
  const sortBy = (searchParams.sortBy as WarehouseFilters['sortBy']) || 'name';
  const sortOrder = (searchParams.sortOrder as WarehouseFilters['sortOrder']) || 'asc';

  const warehouseList = await getWarehouses({
    search: search || undefined,
    isActive,
    sortBy,
    sortOrder,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>RIMS Core Operations</span>
              <span>/</span>
              <span className="text-emerald-700">Warehouses</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Warehouse Facilities
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage multi-site storage facilities, fulfillment centers, and per-site inventory
              capacities.
            </p>
          </div>

          {canManage && (
            <Link
              href="/warehouses/new"
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Register Warehouse</span>
            </Link>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="my-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form method="GET" action="/warehouses" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search warehouse name or facility code..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                name="isActive"
                defaultValue={searchParams.isActive ?? ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All Operational Statuses</option>
                <option value="true">Active Facilities Only</option>
                <option value="false">Deactivated Facilities Only</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Apply Filters
              </button>
              {(search || searchParams.isActive) && (
                <Link
                  href="/warehouses"
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Warehouse List */}
        {warehouseList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Warehouse className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-900">No warehouses found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {search || searchParams.isActive
                ? 'No warehouse facilities match the given search criteria.'
                : 'No warehouse facilities have been registered in the system yet.'}
            </p>
            {canManage && !search && (
              <div className="mt-6">
                <Link
                  href="/warehouses/new"
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register First Warehouse</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {warehouseList.map((wh) => (
              <div
                key={wh.id}
                data-testid="warehouse-card"
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {wh.code}
                      </span>
                      <h3 className="mt-2 text-base font-bold text-slate-900 leading-snug">
                        {wh.name}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        wh.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {wh.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-slate-400" />
                          <span>Inactive</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    {wh.address ? (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span className="line-clamp-2">{wh.address}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-slate-400 italic">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>No address specified</span>
                      </div>
                    )}

                    {wh.contactPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{wh.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Aggregated stock metrics */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Products Stocked
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{wh.productCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Total Units On-Hand
                      </p>
                      <p className="text-sm font-bold text-emerald-700 mt-0.5">
                        {parseFloat(wh.totalQuantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">ID: {wh.id.substring(0, 8)}...</span>
                  <Link
                    href={`/warehouses/${wh.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    <span>View Facility</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
