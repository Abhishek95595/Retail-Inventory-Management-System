import React from 'react';
import Link from 'next/link';
import { Boxes, Layers, Database, ShieldCheck, Cpu, Clock, Terminal } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Header and Brand Navigation Placeholder */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <Boxes className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">RIMS</span>
              <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                Phase 1 Foundation
              </span>
              <p className="text-xs text-slate-500">Retail Inventory Management System</p>
            </div>
          </div>
          <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
            <span className="hidden sm:inline-flex items-center text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Environment Ready
            </span>
            <Link
              href="/api/health"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
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
          <section className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm mb-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center space-x-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 mb-6">
                <span>Phase 1 Milestone</span>
                <span>•</span>
                <span>Tooling & Architecture Baseline</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Retail Inventory Management System
              </h1>
              <p className="mt-4 text-base text-slate-600 leading-relaxed sm:text-lg">
                The application foundation and developer tooling are fully configured. Core
                architecture primitives, strict TypeScript bindings, Tailwind styling, Drizzle ORM
                database access, and testing suites are verified.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center space-x-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700">
                  <Terminal className="h-4 w-4 text-slate-500" />
                  <span>Next.js 14 App Router</span>
                </div>
                <div className="flex items-center space-x-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700">
                  <Database className="h-4 w-4 text-slate-500" />
                  <span>Drizzle ORM & PostgreSQL</span>
                </div>
                <div className="flex items-center space-x-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-mono text-slate-700">
                  <Cpu className="h-4 w-4 text-slate-500" />
                  <span>Vitest & Playwright</span>
                </div>
              </div>
            </div>
          </section>

          {/* Architecture Status Grid */}
          <div className="mb-12">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6">
              Core Technical Foundation Status
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Card 1 */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Active
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900">App Router & UI Tooling</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Next.js with React 18 and strict TypeScript configuration. Tailwind CSS with
                  utility optimizations and responsive typography.
                </p>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Database className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Verified
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900">PostgreSQL & Drizzle ORM</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Zero-overhead SQL schema and migrations setup via drizzle-kit. Server-only
                  database client guard protecting against client bundle leakage.
                </p>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Configured
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900">Quality Assurance Tooling</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Vitest test runner for domain calculation unit tests and Playwright test harness
                  for end-to-end browser workflows.
                </p>
              </div>
            </div>
          </div>

          {/* Agile Roadmap Sequence */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Agile Implementation Sequence</h2>
                <p className="text-sm text-slate-500">
                  Explicit Phase Boundaries — Business workflows deferred to subsequent phases
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400">15-Sprint Backlog</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  ✓
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900">
                    Phase 1: Environment & Tooling (Current)
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Next.js App Router, Docker Compose, PostgreSQL baseline, Drizzle ORM, Vitest,
                    Playwright, and strict environment configuration.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <Clock className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">
                    Phase 2: Database Schema & Core Entities (Next)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Normalized relational tables for Users, Products, Categories, Warehouses,
                    Balances, Orders, and Ledger movements.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <Clock className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">
                    Phase 3: Authentication & Role-Based Access Control
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Auth.js with Argon2id password hashing, session tokens, and route protection for
                    Admin, Manager, Warehouse Staff, and Auditor roles.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <Clock className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">
                    Phase 4+: Inventory Operations, Orders & Fulfillment
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
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
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-slate-500">
            Retail Inventory Management System (RIMS) — Capstone Case Study.
          </p>
          <div className="flex items-center space-x-4 text-xs text-slate-500">
            <span>Ask Mode Foundation</span>
            <span>•</span>
            <span>Ready for Phase 2 Schema Review</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
