# Architecture Decision Record (ADR)

## ADR-003: NextAuth.js JWT Session Strategy & Argon2id Password Security

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Senior Full-Stack Software Architect, Security Engineer

### Context

RIMS requires role-based access control (RBAC) across five distinct operational roles (`ADMIN`, `INVENTORY_MANAGER`, `WAREHOUSE_STAFF`, `SALES_REP`, `AUDITOR`). Authentication must integrate securely with the PostgreSQL database without exposing credentials, session leaks, or performance bottlenecks under high throughput.

Options evaluated:

1. Database Sessions (every HTTP request performs an active session lookup)
2. JWT Sessions signed via `NEXTAUTH_SECRET` with server-side account validation
3. Third-party SaaS authentication (Clerk, Auth0)

### Decision

We adopt **NextAuth.js with JWT Strategy** combined with **Argon2id password hashing** and a **live server-side active-account verification guard (`requireAuth`)**.

### Rationale

1. **Argon2id Password Security:** Argon2id is the winner of the Password Hashing Competition (PHC) and is recommended by OWASP for password storage. It provides resistance against GPU/ASIC cracking and side-channel attacks via configurable memory cost (64 MB), time cost (3 iterations), and parallelism (4 threads).
2. **Stateless JWT Tokens with Encrypted Cookie Attributes:** JWT tokens are stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies. Sensitive attributes (such as password hashes) are strictly excluded from the JWT token and session payloads.
3. **Mid-Session Revocation Guard (`requireAuth`):** While edge middleware rapidly validates JWT structure for page routing, server data operations invoke `requireAuth()`, which verifies against the live PostgreSQL database that the user exists and `is_active === true`. If an administrator deactivates a user, their access to mutations and data operations is terminated immediately without waiting for token expiration.
4. **Deny-by-Default Centralized RBAC:** All operational endpoints require explicit permission keys (e.g., `catalog:manage`, `orders:fulfill`) checked via `requirePermission()`. Unspecified permissions or null roles are denied by default.

### Consequences

- **Positive:** High performance; zero database bloat from ephemeral session rows; immediate revocation capability for deactivated accounts; complete audit trail linkage via immutable user UUIDs.
- **Negative:** Role modifications require the user to re-authenticate or have their token refreshed during the next session cycle.
