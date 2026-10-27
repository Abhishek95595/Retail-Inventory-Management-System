'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, AlertCircle, CheckCircle, X, Shield, Edit2 } from 'lucide-react';
import { UserRole } from '@/lib/permissions';

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export function UserManagementActions({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('WAREHOUSE_STAFF');
  const [isActive, setIsActive] = useState(true);

  const openCreateModal = () => {
    setIsEditingUser(null);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRole('WAREHOUSE_STAFF');
    setIsActive(true);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (isEditingUser) {
        // Update user
        const payload: Record<string, unknown> = {
          firstName,
          lastName,
          role,
          isActive,
        };
        if (password) {
          payload.password = password;
        }

        const res = await fetch(`/api/users/${isEditingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update user.');
        }

        setSuccess(`User ${data.data.email} updated successfully.`);
        setTimeout(() => {
          setIsModalOpen(false);
          router.refresh();
        }, 1000);
      } else {
        // Create user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            role,
            isActive,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to create user account.');
        }

        setSuccess(`Account ${data.data.email} created successfully.`);
        setTimeout(() => {
          setIsModalOpen(false);
          router.refresh();
        }, 1000);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-3">
        <button
          onClick={openCreateModal}
          className="inline-flex items-center space-x-1.5 rounded-lg bg-[#A31C1B] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#8a1817] transition"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Modal dialog for user creation / edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-[#A31C1B]" />
                <h3 className="text-base font-bold text-white">
                  {isEditingUser
                    ? `Edit Account: ${isEditingUser.email}`
                    : 'Provision New System User'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-[#262626] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-start space-x-2 rounded-lg bg-rose-950/60 p-3 text-xs text-rose-300 border border-rose-800/60">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start space-x-2 rounded-lg bg-emerald-950/60 p-3 text-xs text-emerald-300 border border-emerald-800/60">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {!isEditingUser && (
                <div>
                  <label className="block font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@rims.local"
                    className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  Assigned RBAC Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                >
                  <option value="ADMIN" className="bg-[#1a1a1a] text-white">
                    ADMIN — Full System Access
                  </option>
                  <option value="INVENTORY_MANAGER" className="bg-[#1a1a1a] text-white">
                    INVENTORY_MANAGER — Operations & Adjustments
                  </option>
                  <option value="WAREHOUSE_STAFF" className="bg-[#1a1a1a] text-white">
                    WAREHOUSE_STAFF — Goods Receipts & Movement
                  </option>
                  <option value="SALES_REP" className="bg-[#1a1a1a] text-white">
                    SALES_REP — Order Intake & Pricing
                  </option>
                  <option value="AUDITOR" className="bg-[#1a1a1a] text-white">
                    AUDITOR — Compliance & Reports Read-Only
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  {isEditingUser
                    ? 'New Password (Leave blank to keep existing)'
                    : 'Account Password *'}
                </label>
                <input
                  type="password"
                  required={!isEditingUser}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEditingUser ? '••••••••••••' : 'Minimum 8 characters'}
                  className="w-full rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B]"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  disabled={isEditingUser?.id === currentUserId}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[#333333] bg-[#141414] text-[#A31C1B] focus:ring-[#A31C1B]"
                />
                <label htmlFor="isActive" className="text-xs font-medium text-neutral-300">
                  Account is Active (Uncheck to deactivate login access)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-[#333333] bg-[#141414] px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-[#222222] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-[#A31C1B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8a1817] transition disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : isEditingUser ? 'Update Account' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function UserRoleStatusRowButton({ user }: { user: SafeUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, isActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update user.');
      }
      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Update failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 underline"
      >
        <Edit2 className="h-3 w-3" />
        <span>Edit Role / Status</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm text-left">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-sm">Modify {user.email}</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="rounded bg-rose-50 p-2 text-xs text-rose-800 border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  RBAC Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                  <option value="WAREHOUSE_STAFF">WAREHOUSE_STAFF</option>
                  <option value="SALES_REP">SALES_REP</option>
                  <option value="AUDITOR">AUDITOR</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id={`active-${user.id}`}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor={`active-${user.id}`} className="text-xs font-medium text-slate-700">
                  Account Active
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
