'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Boxes,
  FolderTree,
  LogOut,
  LayoutDashboard,
  Shield,
  Warehouse,
  PackageSearch,
  History,
  ArrowLeftRight,
  ShoppingCart,
  Truck,
  BarChart3,
  FileCheck,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

interface AppHeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Boxes },
    { name: 'Categories', href: '/categories', icon: FolderTree },
    { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
    { name: 'Inventory', href: '/inventory', icon: PackageSearch },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Purchasing', href: '/purchasing', icon: Truck },
    { name: 'Transfers', href: '/transfers', icon: ArrowLeftRight },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Audit Log', href: '/audit-logs', icon: FileCheck },
    { name: 'Movements', href: '/inventory/movements', icon: History },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-6">
          <Link href="/app" className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Boxes className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900">RIMS</span>
              <span className="hidden sm:inline-block ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                Phase 10 Operations & Reports
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
            <span className="inline-flex items-center space-x-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              <Shield className="h-2.5 w-2.5 text-emerald-600" />
              <span>{user.role}</span>
            </span>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center space-x-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
