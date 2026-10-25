import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/server/auth';
import { getUsers } from '@/server/users';
import { hasPermission, PERMISSIONS, UserRole } from '@/lib/permissions';
import { AppHeader } from '@/components/AppHeader';
import { UserManagementActions, UserRoleStatusRowButton } from '@/components/UserManagementActions';
import { Shield, Search, CheckCircle2, XCircle } from 'lucide-react';

interface UsersPageProps {
  searchParams: {
    search?: string;
    role?: string;
    isActive?: string;
  };
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  let currentUser;
  try {
    currentUser = await requireAuth();
  } catch {
    redirect('/login');
  }

  if (!hasPermission(currentUser.role, PERMISSIONS.USERS_MANAGE)) {
    redirect('/app');
  }

  const search = searchParams.search || '';
  const role = searchParams.role as UserRole | undefined;
  const isActive =
    searchParams.isActive !== undefined ? searchParams.isActive === 'true' : undefined;

  const userList = await getUsers({
    search: search || undefined,
    role: role || undefined,
    isActive,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <AppHeader user={currentUser} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>Administration & Security</span>
              <span>/</span>
              <span className="text-emerald-700">User Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              User & Access Administration
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage system staff, authentication credentials, and Role-Based Access Control (RBAC)
              assignments.
            </p>
          </div>

          <UserManagementActions currentUserId={currentUser.id} />
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form
            method="GET"
            action="/admin/users"
            className="grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by name or email address..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <select
                name="role"
                defaultValue={role || ''}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All RBAC Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                <option value="WAREHOUSE_STAFF">WAREHOUSE_STAFF</option>
                <option value="SALES_REP">SALES_REP</option>
                <option value="AUDITOR">AUDITOR</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
              >
                Apply Filters
              </button>
              {(search || role) && (
                <a
                  href="/admin/users"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear
                </a>
              )}
            </div>
          </form>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Configured User Accounts ({userList.length} total)
            </h2>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Least Privilege Security Active</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No user accounts found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  userList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center space-x-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {usr.firstName[0]}
                            {usr.lastName[0]}
                          </div>
                          <span>{usr.name}</span>
                          {usr.id === currentUser.id && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{usr.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            usr.role === 'ADMIN'
                              ? 'bg-rose-100 text-rose-800'
                              : usr.role === 'INVENTORY_MANAGER'
                                ? 'bg-amber-100 text-amber-800'
                                : usr.role === 'SALES_REP'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : usr.role === 'AUDITOR'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {usr.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {usr.isActive ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-600 font-semibold text-[11px]">
                            <XCircle className="h-3.5 w-3.5 text-rose-500" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(usr.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {usr.id === currentUser.id ? (
                          <span className="text-[11px] text-slate-400">Current Session</span>
                        ) : (
                          <UserRoleStatusRowButton user={usr} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
