import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/server/auth';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { Boxes, ShieldCheck, UserCheck, Key, LogOut } from 'lucide-react';

export default async function AppDashboardPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Boxes className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">RIMS</span>
              <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Phase 3 Authenticated
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">{user.name}</p>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600">
                {user.role}
              </span>
            </div>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center space-x-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5 text-slate-500" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Identity Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-3">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Session Verified Server-Side</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Welcome, {user.name}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Authenticated User ID: <code className="text-xs font-mono">{user.id}</code> •
                  Email: <code className="text-xs font-mono">{user.email}</code>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  Role: {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* RBAC Permissions Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Key className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Active Role Permissions ({permissions.length} granted)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Granular permission keys derived from the RIMS RBAC matrix. Deny-by-default is
              enforced for any unassigned key.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {permissions.map((perm) => (
                <div
                  key={perm}
                  className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{perm}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phase 3 Boundary Notice */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <h3 className="text-sm font-semibold text-slate-700">Phase 3 Scope Completed</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl mx-auto">
              Authentication, session tokens, Argon2id encryption, and server-side RBAC guards are
              active. Product catalog CRUD and warehouse inventory operations remain scheduled for
              Phase 4+.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
