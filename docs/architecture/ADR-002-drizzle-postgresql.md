# Architecture Decision Record (ADR)

## ADR-002: PostgreSQL & Drizzle ORM for Data Persistence & Concurrency

- **Status:** Accepted
- **Date:** 2026-10-25
- **Deciders:** Senior Full-Stack Software Architect, Database Designer

### Context

RIMS manages multi-warehouse stock balances, purchase orders, goods receipts, and atomic order fulfillment. The core requirement is maintaining strict data integrity:
$$\text{Available} = \text{On-Hand} - \text{Reserved} - \text{Quarantined}$$
Concurrent checkouts, simultaneous receiving, and warehouse transfers must never result in negative stock balances, race condition oversells, or lost transaction records.

The stack choices evaluated were:

1. PostgreSQL with Drizzle ORM
2. PostgreSQL with Prisma ORM
3. MySQL with TypeORM

### Decision

We adopt **PostgreSQL 15+** with **Drizzle ORM (`drizzle-orm`)** and **Drizzle Kit (`drizzle-kit`)**.

### Rationale

1. **Pessimistic Row Locking & ACID Transactions:** Drizzle provides native SQL expression capabilities, allowing straightforward execution of `SELECT ... FOR UPDATE` row locks inside PostgreSQL transactions. This is critical for preventing race conditions during order reservations without the overhead of heavy ORM abstractions.
2. **Zero Runtime Overhead:** Unlike Prisma, Drizzle does not require an external C++/Rust binary query engine. It translates TypeScript declarations directly into standard parameterized SQL queries, minimizing memory footprint and cold-start latency.
3. **Transparent Migrations:** Schema changes in `src/db/schema/` are version-controlled and emitted as clean, auditable SQL files via `drizzle-kit generate`. This aligns with enterprise database auditing and CI/CD promotion pipelines.
4. **Relational Constraints & Check Rules:** PostgreSQL enforces database-level table check constraints (e.g., `CHECK (on_hand_qty >= 0)`) and foreign key cascades, guaranteeing integrity regardless of application-level bugs.

### Consequences

- **Positive:** Maximum query performance; explicit transaction control; minimal bundle size; reliable SQL migrations.
- **Negative:** Requires team familiarity with relational SQL semantics (no hidden ORM magic).
