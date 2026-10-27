'use client';

import React, { useState } from 'react';
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
  Users,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { hasPermission, PERMISSIONS, UserRole } from '@/shared/permissions';

interface AppHeaderProps {
  user: {
    id?: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userRole = user.role as UserRole;

  // Determine role-based menu items
  const allNavItems = [
    {
      name: 'Dashboard',
      href: '/app',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      name: 'Products',
      href: '/products',
      icon: Boxes,
      allowed: hasPermission(userRole, PERMISSIONS.CATALOG_READ),
    },
    {
      name: 'Categories',
      href: '/categories',
      icon: FolderTree,
      allowed: hasPermission(userRole, PERMISSIONS.CATALOG_READ),
    },
    {
      name: 'Warehouses',
      href: '/warehouses',
      icon: Warehouse,
      allowed: hasPermission(userRole, PERMISSIONS.WAREHOUSE_READ),
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: PackageSearch,
      allowed: hasPermission(userRole, PERMISSIONS.INVENTORY_READ),
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingCart,
      allowed: hasPermission(userRole, PERMISSIONS.ORDERS_READ),
    },
    {
      name: 'Purchasing',
      href: '/purchasing',
      icon: Truck,
      allowed: hasPermission(userRole, PERMISSIONS.PURCHASING_READ),
    },
    {
      name: 'Transfers',
      href: '/transfers',
      icon: ArrowLeftRight,
      allowed:
        hasPermission(userRole, PERMISSIONS.INVENTORY_TRANSFER_MANAGE) ||
        hasPermission(userRole, PERMISSIONS.INVENTORY_TRANSFER_DISPATCH) ||
        hasPermission(userRole, PERMISSIONS.INVENTORY_TRANSFER_RECEIVE),
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart3,
      allowed: hasPermission(userRole, PERMISSIONS.REPORTS_READ),
    },
    {
      name: 'Audit Log',
      href: '/audit-logs',
      icon: FileCheck,
      allowed: hasPermission(userRole, PERMISSIONS.AUDIT_READ),
    },
    {
      name: 'Movements',
      href: '/inventory/movements',
      icon: History,
      allowed: hasPermission(userRole, PERMISSIONS.INVENTORY_READ),
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      allowed: hasPermission(userRole, PERMISSIONS.USERS_MANAGE),
    },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.allowed);

  // Generate breadcrumb items
  const pathParts = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const url = '/' + pathParts.slice(0, index + 1).join('/');
    const isLast = index === pathParts.length - 1;
    let label = part.charAt(0).toUpperCase() + part.slice(1);
    if (part === 'app') label = 'Dashboard';
    if (part === 'audit-logs') label = 'Audit Logs';
    if (part === 'admin') label = 'Admin';
    if (part === 'receipts') label = 'Receipts';
    if (part.length > 20) label = 'Details';
    return { label, url, isLast };
  });

  return (
    <>
      <header className="border-b border-[#262626] bg-[#171717] sticky top-0 z-50 shadow-md">
        {/* Main top bar */}
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4 lg:space-x-6">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-300 hover:bg-[#262626] hover:text-white transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Brand Logo */}
            <Link href="/app" className="flex items-center space-x-2.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A31C1B] text-white shadow-sm ring-1 ring-white/10">
                <Boxes className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white">RIMS</span>
                <span className="hidden sm:inline-block ml-2 rounded bg-[#06110C] border border-[#1b3327] px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Operations & Reports
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto py-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-[#06110C] text-white border border-[#A31C1B]/60 shadow-xs'
                        : 'text-neutral-300 hover:bg-[#222222] hover:text-white'
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#A31C1B]' : 'text-neutral-400'}`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header: User Menu & Logout */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
              <div className="flex items-center justify-end space-x-1 mt-0.5">
                <span className="inline-flex items-center space-x-1 rounded bg-[#06110C] border border-[#222222] px-1.5 py-0.5 text-[10px] font-semibold text-neutral-300">
                  <Shield className="h-2.5 w-2.5 text-[#A31C1B]" />
                  <span>{user.role}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center space-x-1.5 rounded-lg border border-[#333333] bg-[#222222] px-2.5 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-[#A31C1B] hover:text-white hover:border-[#A31C1B] transition shadow-sm"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#262626] bg-[#171717] px-4 py-3 shadow-inner">
            <div className="mb-3 pb-3 border-b border-[#262626] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{user.name}</p>
                <p className="text-[11px] text-neutral-400">{user.email}</p>
              </div>
              <span className="rounded bg-[#06110C] border border-[#A31C1B]/40 px-2 py-0.5 text-[10px] font-bold text-neutral-200">
                {user.role}
              </span>
            </div>

            <nav className="grid grid-cols-2 gap-1.5">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      isActive ? 'bg-[#A31C1B] text-white' : 'text-neutral-300 hover:bg-[#222222]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Sub-header Breadcrumb Bar */}
        {breadcrumbs.length > 0 && (
          <div className="bg-[#06110C] border-t border-[#222222] px-4 py-1.5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl flex items-center space-x-1.5 text-[11px] text-neutral-400 overflow-x-auto">
              <Link href="/app" className="hover:text-white transition flex items-center">
                <span>RIMS</span>
              </Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.url}>
                  <ChevronRight className="h-3 w-3 text-neutral-600 shrink-0" />
                  {crumb.isLast ? (
                    <span className="font-semibold text-white truncate">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.url} className="hover:text-neutral-200 transition truncate">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
