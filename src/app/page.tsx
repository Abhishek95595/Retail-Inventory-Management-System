import React from 'react';
import Link from 'next/link';
import { Boxes, Layers, Database, ShieldCheck, Cpu, Terminal } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#171717] text-neutral-100">
      {/* Header and Brand Navigation */}
      <header className="border-b border-[#262626] bg-[#171717] sticky top-0 z-50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#A31C1B] text-white shadow-sm">
              <Boxes className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">RIMS</span>
              <span className="ml-2 rounded bg-[#06110C] border border-[#262626] px-2 py-0.5 text-xs font-semibold text-neutral-200">
                Phase 1 Foundation
              </span>
              <p className="text-xs text-neutral-400">Retail Inventory Management System</p>
            </div>
          </div>
          <nav className="flex items-center space-x-4 text-sm font-medium text-neutral-300">
            <span className="hidden sm:inline-flex items-center text-xs text-neutral-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Environment Ready
            </span>
            <Link
              href="/login"
              className="rounded-md bg-[#A31C1B] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#8a1817] transition shadow-sm"
            >
              Sign In to Portal →
            </Link>
            <Link
              href="/api/health"
              className="rounded-md border border-[#333333] bg-[#1a1a1a] px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-[#222222] transition shadow-sm"
            >
              System Health API
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Hero Banner */}
          <section className="rounded-2xl border border-[#262626] bg-[#1a1a1a] p-8 sm:p-12 shadow-sm mb-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center space-x-2 rounded-full bg-[#06110C] px-3 py-1 text-xs font-semibold text-neutral-300 ring-1 ring-inset ring-[#262626] mb-6">
                <span className="text-[#A31C1B] font-bold">●</span>
                <span>Retail Inventory Management Platform</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Retail Inventory Management System
              </h1>
              <p className="mt-4 text-base text-neutral-300 leading-relaxed sm:text-lg">
                The enterprise foundation and inventory operations portal are live. Multi-warehouse
                tracking, atomic reservations, stock movement audit trails, and executive inventory
                valuation reports.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/app"
                  className="inline-flex items-center space-x-2 rounded-xl bg-[#A31C1B] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#8a1817] transition"
                >
                  <span>Launch Operational Portal</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center space-x-2 rounded-xl border border-[#333333] bg-[#141414] px-5 py-2.5 text-sm font-semibold text-neutral-200 shadow-sm hover:bg-[#222222] transition"
                >
                  <span>Sign In</span>
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center space-x-2 rounded-lg bg-[#141414] border border-[#262626] px-3 py-2 text-xs font-mono text-neutral-300">
                  <Terminal className="h-4 w-4 text-[#A31C1B]" />
                  <span>Next.js 14 App Router</span>
                </div>
                <div className="flex items-center space-x-2 rounded-lg bg-[#141414] border border-[#262626] px-3 py-2 text-xs font-mono text-neutral-300">
                  <Database className="h-4 w-4 text-[#A31C1B]" />
                  <span>Drizzle ORM & PostgreSQL</span>
                </div>
                <div className="flex items-center space-x-2 rounded-lg bg-[#141414] border border-[#262626] px-3 py-2 text-xs font-mono text-neutral-300">
                  <Cpu className="h-4 w-4 text-[#A31C1B]" />
                  <span>Vitest & Playwright</span>
                </div>
              </div>
            </div>
          </section>

          {/* Architecture Status Grid */}
          <div className="mb-12">
            <h2 className="text-xl font-bold tracking-tight text-white mb-6">
              Core Technical Foundation Status
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Card 1 */}
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#06110C] border border-[#262626] text-blue-400">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    Active
                  </span>
                </div>
                <h3 className="font-semibold text-white">App Router & UI Tooling</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Next.js with React 18 and strict TypeScript configuration. Tailwind CSS with
                  utility optimizations and responsive typography.
                </p>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#06110C] border border-[#262626] text-amber-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    Verified
                  </span>
                </div>
                <h3 className="font-semibold text-white">PostgreSQL & Drizzle ORM</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Zero-overhead SQL schema and migrations setup via drizzle-kit. Server-only
                  database client guard protecting against client bundle leakage.
                </p>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#06110C] border border-[#262626] text-purple-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    Configured
                  </span>
                </div>
                <h3 className="font-semibold text-white">Quality Assurance Tooling</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Vitest test runner for domain calculation unit tests and Playwright test harness
                  for end-to-end browser workflows.
                </p>
              </div>
            </div>
          </div>

          {/* Agile Roadmap Sequence */}
          <div className="rounded-2xl border border-[#262626] bg-[#1a1a1a] p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#262626] pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">System Architecture & Capabilities</h2>
                <p className="text-sm text-neutral-400">
                  Complete operational pipeline from receiving to sales order fulfillment
                </p>
              </div>
              <span className="text-xs font-medium text-neutral-500">Production Ready</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#06110C] border border-[#262626]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A31C1B] text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Phase 1: Environment & Tooling Baseline
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1">
                    Next.js App Router, Docker Compose, PostgreSQL baseline, Drizzle ORM, Vitest,
                    Playwright, and strict environment configuration.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#141414] border border-[#262626]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A31C1B] text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Phase 2: Database Schema & Core Entities
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Normalized relational schema for Users, Products, Categories, Warehouses,
                    Balances, Orders, and immutable audit logs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#141414] border border-[#262626]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A31C1B] text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Phase 3: Authentication & Role-Based Access Control
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Auth.js with Argon2id password hashing, revocation timestamp guards, and route
                    protection for Admin, Manager, Warehouse Staff, and Auditor roles.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-3 rounded-lg bg-[#141414] border border-[#262626]">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A31C1B] text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Phase 4+: Inventory Operations, Orders & Fulfillment
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Stock movements, atomic sales order reservations, purchasing, goods receipts,
                    and executive reporting with CSV exports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262626] bg-[#141414] py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-neutral-400">
            Retail Inventory Management System (RIMS) — Enterprise Inventory Platform.
          </p>
          <div className="flex items-center space-x-4 text-xs text-neutral-500">
            <span>Charcoal • Forest • Crimson</span>
            <span>•</span>
            <span>Refined Dark Theme</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
