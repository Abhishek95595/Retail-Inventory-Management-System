# Retail Inventory Management System (RIMS)

### Agile Capstone Case Study — Phase 5: Warehouse Management & Inventory Balances

A production-grade retail inventory management system built with **Next.js App Router**, **TypeScript**, **PostgreSQL**, **Drizzle ORM**, **Auth.js (NextAuth)**, **Argon2id**, **Tailwind CSS**, **Vitest**, and **Playwright**.

---

## 1. Project Overview

RIMS is designed to solve retail multi-warehouse inventory tracking, procurement, order fulfillment, and audit governance through 8 Epics and 15 Sprints.

**Current State: Phase 5 Completed (Warehouse Management & Inventory Balances)**

- Multi-site warehouse facilities management with operational status activation/deactivation and deletion protection.
- Live inventory balance visibility strictly maintaining PostgreSQL generated invariant: `Available = On-Hand - Reserved - Quarantined`.
- Read-only multi-criteria inventory ledger with warehouse, product, and category filters.
- Per-warehouse stock balance breakdown integrated directly onto product detail views.
- Strict RBAC enforcement using `warehouse:read`, `warehouse:manage`, and `inventory:read`.
- Transactional audit logging for warehouse facility lifecycle events.
- Complete automated test suite covering Vitest integration tests and Playwright E2E browser scenarios.

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

Edit `.env.local` to configure your database connection string and application secret:

```env
DATABASE_URL="postgresql://postgres:postgres_dev_password@localhost:5432/rims_dev"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="a-secure-random-32-byte-hex-or-base64-secret"
```

### 2. Start PostgreSQL & Run Migrations

Using Docker Compose:

```bash
docker compose up -d
```

Or start your native PostgreSQL service (`brew services start postgresql@16`).

Run pending migrations:

```bash
npm run db:migrate
```

### 3. Seed Development Administrator

Create the initial administrator account securely with an Argon2id password hash:

```bash
npm run db:seed:admin
```

_Default local credentials: `admin@rims.local` / `AdminPassword123!`_

### 4. Launch the Application

```bash
npm run dev
```

- Public Landing: [http://localhost:3000](http://localhost:3000)
- Sign-In Portal: [http://localhost:3000/login](http://localhost:3000/login)
- Authenticated Dashboard: [http://localhost:3000/app](http://localhost:3000/app)
- Products Catalog: [http://localhost:3000/products](http://localhost:3000/products)
- Categories Directory: [http://localhost:3000/categories](http://localhost:3000/categories)

---

## 3. Implemented Routes & API Endpoints

| View / Endpoint         |       Method       | Required Permission               | Description                                                   |
| :---------------------- | :----------------: | :-------------------------------- | :------------------------------------------------------------ |
| `/products`             |        GET         | `catalog:read`                    | Master product catalog with search, filtering, and pagination |
| `/products/new`         |        GET         | `catalog:manage`                  | Product creation form                                         |
| `/products/[id]`        |        GET         | `catalog:read`                    | Detailed product overview view                                |
| `/products/[id]/edit`   |        GET         | `catalog:manage`                  | Product editing and soft-archiving form                       |
| `/categories`           |        GET         | `catalog:read`                    | Hierarchical categories directory with product counts         |
| `/categories/new`       |        GET         | `catalog:manage`                  | Category creation form                                        |
| `/categories/[id]/edit` |        GET         | `catalog:manage`                  | Category editing form with hierarchy protection               |
| `/api/products`         |        GET         | `catalog:read`                    | Paginated product search API                                  |
| `/api/products`         |        POST        | `catalog:manage`                  | Product creation API                                          |
| `/api/products/[id]`    | GET / PUT / DELETE | `catalog:read` / `catalog:manage` | Retrieve, update, or soft-archive product                     |
| `/api/categories`       |     GET / POST     | `catalog:read` / `catalog:manage` | Retrieve categories list or create category                   |
| `/api/categories/[id]`  | GET / PUT / DELETE | `catalog:read` / `catalog:manage` | Retrieve, update, or delete category                          |

---

## 4. Development & Testing Scripts

| Script                  | Purpose                                                   |
| :---------------------- | :-------------------------------------------------------- |
| `npm run dev`           | Start local Next.js development server on port 3000       |
| `npm run build`         | Compile optimized production build                        |
| `npm run start`         | Run production build                                      |
| `npm run typecheck`     | Execute strict TypeScript compiler check (`tsc --noEmit`) |
| `npm run lint`          | Run ESLint verification                                   |
| `npm run format:check`  | Verify Prettier code formatting                           |
| `npm run format`        | Automatically format all project files                    |
| `npm run test`          | Run Vitest unit and PostgreSQL integration test suites    |
| `npm run test:e2e`      | Run Playwright end-to-end browser tests                   |
| `npm run db:check`      | Test live database connection via Drizzle                 |
| `npm run db:generate`   | Generate SQL migrations from Drizzle schemas              |
| `npm run db:migrate`    | Execute pending database migrations                       |
| `npm run db:seed:admin` | Safely seed local administrator account                   |

---

## 5. Role-Based Access Control (RBAC) Matrix

| Module / Operation      | Permission Key                 | Admin | Inventory Manager | Warehouse Staff  | Sales Rep | Auditor |
| :---------------------- | :----------------------------- | :---: | :---------------: | :--------------: | :-------: | :-----: |
| **Catalog Read**        | `catalog:read`                 |   ✓   |         ✓         |        ✓         |     ✓     |    ✓    |
| **Catalog Manage**      | `catalog:manage`               |   ✓   |         ✓         |        -         |     -     |    -    |
| **Warehouse Read**      | `warehouse:read`               |   ✓   |         ✓         |        ✓         |     ✓     |    ✓    |
| **Warehouse Manage**    | `warehouse:manage`             |   ✓   |         -         |        -         |     -     |    -    |
| **Inventory Read**      | `inventory:read`               |   ✓   |         ✓         |        ✓         |     ✓     |    ✓    |
| **Adjust Create**       | `inventory:adjust:create`      |   ✓   |         ✓         |        ✓         |     -     |    -    |
| **Adjust Approve**      | `inventory:adjust:approve`     |   ✓   |         ✓         |        -         |     -     |    -    |
| **Transfer Operations** | `inventory:transfer:*`         |   ✓   |         ✓         | Dispatch/Receive |     -     |    -    |
| **Sales Orders**        | `orders:create`, `cancel`      |   ✓   |         -         |        -         |     ✓     |    -    |
| **Order Fulfillment**   | `orders:fulfill`               |   ✓   |         ✓         |        ✓         |     -     |    -    |
| **Purchase Orders**     | `purchasing:order:*`           |   ✓   |  Create/Approve   |        -         |     -     |    -    |
| **Goods Receiving**     | `purchasing:receive`           |   ✓   |         ✓         |        ✓         |     -     |    -    |
| **Suppliers Manage**    | `suppliers:manage`             |   ✓   |         ✓         |        -         |     -     |    -    |
| **Reports Read/Export** | `reports:*`                    |   ✓   |         ✓         |        -         |   Read    |    ✓    |
| **User Administration** | `users:manage`, `roles:assign` |   ✓   |         -         |        -         |     -     |    -    |
| **Audit Logs**          | `audit:read`                   |   ✓   |         ✓         |        -         |     -     |    ✓    |
