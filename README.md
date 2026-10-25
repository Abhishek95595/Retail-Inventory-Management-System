# Retail Inventory Management System (RIMS)

### Agile Capstone Case Study — Phase 10: Operational Dashboards, Reporting & Audit Review

A production-grade retail inventory management system built with **Next.js App Router**, **TypeScript**, **PostgreSQL**, **Drizzle ORM**, **Auth.js (NextAuth)**, **Argon2id**, **Tailwind CSS**, **Vitest**, and **Playwright**.

---

## 1. Project Overview

RIMS is designed to solve retail multi-warehouse inventory tracking, procurement, order fulfillment, and audit governance through 8 Epics and 15 Sprints.

**Current State: Phase 10 Completed (Operational Dashboards, Reporting & Audit Review)**

- **Operational Dashboard (`/app`)**: Real-time aggregate KPIs showing active catalog products and warehouses, defensible inventory valuation ($\sum \text{on\_hand} \times \text{cost\_price}$), low-stock alerts ($available \le reorder\_point$), zero stockouts, sales and purchase order lifecycle pipelines, recent stock movements, and latest supplier receipts.
- **Inventory Valuation & Facility Reporting (`/reports`)**: Paginated multi-warehouse inventory reports filterable by warehouse facility, category, product/SKU search, low-stock threshold, and zero-stock conditions. Includes safe CSV export with formula injection sanitization (`=, +, -, @` prefixed with `'`).
- **Immutable Audit Review Interface (`/audit-logs`)**: Read-only, tamper-evident audit inspection table restricted to authorized roles (`AUDIT_READ`), filterable by action, entity category, date range, and actor, featuring automatic redaction of sensitive parameters (`passwordHash`, `token`).
- **Server-Side Authorization**: Enforced across API routes and server actions using granular permissions: `reports:read`, `reports:export`, and `audit:read`.
- **Preserved System Invariants**: Uncompromised database generated column `available_qty = on_hand_qty - reserved_qty - quarantined_qty` and existing inventory transaction engines.
- **Automated Verification**: Complete suite of 77 Vitest unit/integration tests and comprehensive Playwright E2E browser tests.

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

---

## 6. Production Deployment Readiness & Operations

### Production Environment Checklist

1. **Environment Variables**:
   - `NODE_ENV="production"`
   - `DATABASE_URL`: Dedicated, firewalled PostgreSQL connection pooler (e.g. PgBouncer/Supabase/RDS).
   - `NEXTAUTH_URL`: Canonical public HTTPS URL of the application.
   - `NEXTAUTH_SECRET`: Strong 32-byte cryptographically random string (`openssl rand -base64 32`).
2. **Database Migration Step**:
   - Execute migrations separately prior to rolling traffic:
     ```bash
     npm run db:migrate
     ```
3. **Database Seeding Safeguard**:
   - `npm run db:seed:admin` is blocked by default in production. Never seed default credentials to production environments.
4. **Database Backup & Disaster Recovery Procedures**:
   - **Full Database Dump**:
     ```bash
     pg_dump -Fc --no-acl --no-owner -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f rims_backup_$(date +%Y%m%d_%H%M%S).dump
     ```
   - **Database Restore**:
     ```bash
     pg_restore --clean --if-exists --no-acl --no-owner -h <DB_HOST> -U <DB_USER> -d <DB_NAME> rims_backup_<timestamp>.dump
     ```
   - _Note:_ Backups should be taken daily and stored in encrypted object storage with retention policies. Always perform restore dry-runs against isolated staging instances before executing production restores.
