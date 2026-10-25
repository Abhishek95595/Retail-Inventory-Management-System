# Retail Inventory Management System (RIMS)

### Agile Capstone Case Study — Phase 1: Environment & Tooling

A production-ready retail inventory management system built with **Next.js App Router**, **TypeScript**, **PostgreSQL**, **Drizzle ORM**, **Tailwind CSS**, **Vitest**, and **Playwright**.

---

## 1. Project Overview

RIMS is designed to solve retail multi-warehouse inventory tracking, procurement, order fulfillment, and audit governance through 8 Epics and 15 Sprints.

**Current State: Phase 1 (Environment & Tooling)**

- Clean, type-safe full-stack Next.js 14 App Router foundation.
- PostgreSQL database infrastructure via Docker Compose and native local setups.
- Drizzle ORM configuration with server-only connection guards.
- Quality assurance pipeline: Vitest (unit tests) and Playwright (end-to-end browser tests).
- Automated linting, code formatting, and strict TypeScript checks.

---

## 2. Quick Start

### Prerequisites

- Node.js `v20+` or `v24+`
- npm `v10+` or `v11+`
- PostgreSQL 15+ (via Docker Compose or local Homebrew PostgreSQL)

### 1. Setup Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` to configure your database connection string:

```env
DATABASE_URL="postgresql://postgres:postgres_dev_password@localhost:5432/rims_dev"
```

### 2. Start PostgreSQL

Using Docker Compose:

```bash
docker compose up -d
```

Or start your native PostgreSQL service (`brew services start postgresql@16`).

Verify connectivity with Drizzle:

```bash
npm run db:check
```

### 3. Launch the Application

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000).

---

## 3. Development Scripts

| Script                 | Purpose                                                   |
| :--------------------- | :-------------------------------------------------------- |
| `npm run dev`          | Start local Next.js development server on port 3000       |
| `npm run build`        | Compile optimized production build                        |
| `npm run start`        | Run production build                                      |
| `npm run typecheck`    | Execute strict TypeScript compiler check (`tsc --noEmit`) |
| `npm run lint`         | Run ESLint verification                                   |
| `npm run format:check` | Verify Prettier code formatting                           |
| `npm run format`       | Automatically format all project files                    |
| `npm run test`         | Run unit tests with Vitest                                |
| `npm run test:e2e`     | Run end-to-end browser tests with Playwright              |
| `npm run db:check`     | Test live database connection via Drizzle                 |
| `npm run db:generate`  | Generate SQL migrations from Drizzle schemas              |
| `npm run db:migrate`   | Execute pending database migrations                       |

---

## 4. Phase Boundaries & Implementation Plan

- **Phase 1 (Complete):** Architecture, Environment, Docker Compose, Drizzle baseline, Testing harnesses.
- **Phase 2 (Next):** Database Schema definition (Users, Products, Warehouses, Balances, Orders, Movements).
- **Phase 3:** Authentication & Role-Based Access Control (Admin, Inventory Manager, Warehouse Staff, Auditor).
- **Phase 4–8:** Business modules (Catalog, Warehouses, Order Fulfillment, Purchasing, Reporting).

For detailed setup instructions, see [docs/development/setup.md](docs/development/setup.md).  
For architecture design records, see [docs/architecture/](docs/architecture/).
