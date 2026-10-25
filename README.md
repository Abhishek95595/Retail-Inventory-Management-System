# Retail Inventory Management System (RIMS)

### Agile Capstone Case Study — Phase 3: Authentication, Session Management & RBAC

A production-grade retail inventory management system built with **Next.js App Router**, **TypeScript**, **PostgreSQL**, **Drizzle ORM**, **Auth.js (NextAuth)**, **Argon2id**, **Tailwind CSS**, **Vitest**, and **Playwright**.

---

## 1. Project Overview

RIMS is designed to solve retail multi-warehouse inventory tracking, procurement, order fulfillment, and audit governance through 8 Epics and 15 Sprints.

**Current State: Phase 3 Completed (Authentication, Sessions & RBAC)**

- Secure credentials authentication powered by **Argon2id** password hashing.
- Encrypted JWT session cookies with mid-session account revocation guards.
- Centralized Role-Based Access Control (RBAC) across all 5 roles: `ADMIN`, `INVENTORY_MANAGER`, `WAREHOUSE_STAFF`, `SALES_REP`, `AUDITOR`.
- Route protection middleware and server-side data guards (`requireAuth`, `requirePermission`).
- Full automated test coverage with Vitest unit/integration tests and Playwright browser E2E workflows.

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

---

## 3. Development & Testing Scripts

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

## 4. Role-Based Access Control (RBAC) Matrix

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

## 5. Architecture Documentation

- [ADR-001: Next.js App Router Architecture](docs/architecture/ADR-001-nextjs-app-router.md)
- [ADR-002: PostgreSQL & Drizzle ORM](docs/architecture/ADR-002-drizzle-postgresql.md)
- [ADR-003: NextAuth JWT & Argon2id Security](docs/architecture/ADR-003-authentication-rbac.md)
- [Database Schema Specification](docs/architecture/database-schema-spec.md)
- [Developer Setup Guide](docs/development/setup.md)
