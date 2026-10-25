# Architecture Decision Record (ADR)

## ADR-001: Next.js App Router for Retail Inventory Management System (RIMS)

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** Senior Full-Stack Software Architect, Business Analyst

### Context

The Retail Inventory Management System (RIMS) requires a unified full-stack architecture that can handle both responsive administrative UI data tables/dashboards and secure, transaction-safe backend business operations (order fulfillment, stock movement logging, goods receiving, and role-based access control).

The initial brief considered either:

1. Next.js App Router (unified TypeScript full-stack)
2. Standalone Frontend (Angular/Vue/React) + Separate Backend API (Node.js/Express or Java Spring Boot)

### Decision

We adopt **Next.js 14+ with App Router (React Server Components + Route Handlers)**.

### Rationale

1. **Server Components for Enterprise Data Grids:** Administrative views (such as Inventory Overview, Movement Ledger, and Audit Trails) require substantial server-side data fetching and security checks. React Server Components stream rendered HTML with minimal client-side JavaScript, improving Initial Server Response and Core Web Vitals (LCP, INP).
2. **Co-located Type-Safe Route Handlers:** REST API endpoints under `/api/v1/*` share domain types, Zod schemas, and validation logic directly with frontend forms without code duplication.
3. **Operational Simplicity:** Eliminates multi-repository coordination, CORS issues, and separate deployment lifecycles for small-to-medium retail operations, while maintaining clean separation of concerns via a dedicated server domain service layer (`src/server/` and `src/db/`).
4. **Security & Boundary Enforcement:** Next.js Server Actions and Route Handlers allow strict server-only execution boundaries, ensuring database credentials, Drizzle query connections, and secret keys can never be leaked to the browser.

### Consequences

- **Positive:** Single language (TypeScript) throughout; shared validation logic (Zod); optimized bundle sizes; simplified containerization and CI/CD pipelines.
- **Negative:** Framework conventions must be strictly maintained (e.g., explicit server-only import guards to prevent database logic in client components).
