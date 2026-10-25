# Retail Inventory Management System (RIMS) — Developer Setup Guide

This guide walks through configuring and running the local development environment for the **Retail Inventory Management System (RIMS)**.

---

## 1. Prerequisites

Ensure your host machine has the following tools installed:

- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **npm**: `v10.x` or `v11.x`
- **PostgreSQL**: Either running via **Docker Compose** or via a native local service (e.g. `Homebrew PostgreSQL 16`)
- **Git**

---

## 2. Environment Configuration

1. Clone or open the repository:

   ```bash
   cd "retail-inventory-management-system"
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Update `.env.local` to match your local database settings:
   - **For Docker Compose (default):**
     ```env
     DATABASE_URL="postgresql://postgres:postgres_dev_password@localhost:5432/rims_dev"
     ```
   - **For Local macOS Homebrew PostgreSQL:**
     ```env
     DATABASE_URL="postgresql://<your_username>:@localhost:5432/rims_dev"
     ```

---

## 3. Database Startup

### Option A: Using Docker Compose

If Docker is installed on your host:

```bash
# Start PostgreSQL container in background
docker compose up -d

# Check container health and status
docker compose ps

# View database logs
docker compose logs -f postgres

# Stop database container
docker compose down
```

### Option B: Using Native Homebrew PostgreSQL

If Docker is not running on your host machine, you can run PostgreSQL natively:

```bash
# Start PostgreSQL service via Homebrew
brew services start postgresql@16

# Create development database if not already present
createdb rims_dev
```

### Verify Database Connectivity:

Run the connection test tool to verify your Drizzle database connection:

```bash
npm run db:check
```

---

## 4. Install Dependencies & Start the Application

1. Install project dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open your browser:
   - Application Home: [http://localhost:3000](http://localhost:3000)
   - Health Check API: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 5. Quality Assurance & Verification Scripts

The following scripts verify project integrity:

```bash
# Run unit tests (Vitest)
npm run test

# Run unit tests with coverage
npm run test:coverage

# Run end-to-end browser tests (Playwright)
npm run test:e2e

# Run TypeScript type-checking
npm run typecheck

# Run ESLint validation
npm run lint

# Run Prettier code formatting check
npm run format:check

# Execute Next.js production build
npm run build
```

---

## 6. Project Architecture Overview

```
src/
├── app/               # Next.js App Router (pages, layout, API routes)
├── components/        # Reusable UI component library (Radix/Tailwind)
├── db/                # Drizzle ORM client, connection pooling, and migrations
│   └── schema/        # Modular relational database schema declarations
├── lib/               # Shared utilities (Zod environment validator, cn helper)
├── server/            # Server-only domain services (Order, Inventory, Purchasing)
└── types/             # Shared TypeScript type definitions
tests/                 # Vitest unit & integration test suites
e2e/                   # Playwright end-to-end browser specifications
docs/                  # Architecture Decision Records (ADRs) and setup guides
```
