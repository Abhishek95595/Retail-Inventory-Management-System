import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/backend/server/auth';
import { getUsers } from '@/backend/server/users';
import { hasPermission, PERMISSIONS, UserRole } from '@/shared/permissions';
import { AppHeader } from '@/frontend/components/AppHeader';
import { UserManagementActions, UserRoleStatusRowButton } from '@/frontend/components/UserManagementActions';
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
    <div className="min-h-screen bg-[#171717] text-neutral-100 pb-12">
      <AppHeader user={currentUser} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-[#262626] gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              <span>Administration & Security</span>
              <span>/</span>
              <span className="text-[#A31C1B]">User Management</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              User & Access Administration
            </h1>
            <p className="mt-1 text-xs text-neutral-400">
              Manage system staff, authentication credentials, and Role-Based Access Control (RBAC)
              assignments.
            </p>
          </div>

          <UserManagementActions currentUserId={currentUser.id} />
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-4 shadow-sm">
          <form
            method="GET"
            action="/admin/users"
            className="grid grid-cols-1 sm:grid-cols-4 gap-3"
          >
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by name or email address..."
                className="w-full rounded-lg border border-[#333333] bg-[#141414] pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
              />
            </div>

            <div>
              <select
                name="role"
                defaultValue={role || ''}
                className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-1.5 text-xs text-white focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
              >
                <option value="" className="bg-[#1a1a1a] text-white">
                  All RBAC Roles
                </option>
                <option value="ADMIN" className="bg-[#1a1a1a] text-white">
                  ADMIN
                </option>
                <option value="INVENTORY_MANAGER" className="bg-[#1a1a1a] text-white">
                  INVENTORY_MANAGER
                </option>
                <option value="WAREHOUSE_STAFF" className="bg-[#1a1a1a] text-white">
                  WAREHOUSE_STAFF
                </option>
                <option value="SALES_REP" className="bg-[#1a1a1a] text-white">
                  SALES_REP
                </option>
                <option value="AUDITOR" className="bg-[#1a1a1a] text-white">
                  AUDITOR
                </option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-[#A31C1B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#8a1817] transition"
              >
                Apply Filters
              </button>
              {(search || role) && (
                <a
                  href="/admin/users"
                  className="rounded-lg border border-[#333333] bg-[#141414] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-[#222222] transition"
                >
                  Clear
                </a>
              )}
            </div>
          </form>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#1a1a1a] shadow-sm">
          <div className="border-b border-[#262626] px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              Configured User Accounts ({userList.length} total)
            </h2>
            <div className="flex items-center space-x-1.5 text-xs text-neutral-400">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>Least Privilege Security Active</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#06110C] text-[11px] font-semibold uppercase tracking-wider text-neutral-300 border-b border-[#262626]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] bg-[#1a1a1a]">
                {userList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500">
                      No user accounts found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  userList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-[#222222] transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white flex items-center space-x-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#06110C] border border-[#262626] text-neutral-200 font-bold text-[11px]">
                            {usr.firstName[0]}
                            {usr.lastName[0]}
                          </div>
                          <span>{usr.name}</span>
                          {usr.id === currentUser.id && (
                            <span className="rounded bg-[#A31C1B]/20 border border-[#A31C1B]/40 px-1.5 py-0.2 text-[10px] font-semibold text-[#f8b4b4]">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-300">{usr.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            usr.role === 'ADMIN'
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                              : usr.role === 'INVENTORY_MANAGER'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : usr.role === 'SALES_REP'
                                  ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800/60'
                                  : usr.role === 'AUDITOR'
                                    ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                                    : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          }`}
                        >
                          {usr.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {usr.isActive ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-400 font-semibold text-[11px]">
                            <XCircle className="h-3.5 w-3.5 text-rose-400" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">
                        {new Date(usr.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {usr.id === currentUser.id ? (
                          <span className="text-[11px] text-neutral-500">Current Session</span>
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
