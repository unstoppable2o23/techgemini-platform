# Phase 19 — Tenant & Security Report

**Date:** 2026-09-03

Server-side tenant isolation and authorization — the MOST IMPORTANT Phase 19 requirement. Verified at the API/authorization layer, not the frontend.

## Centralized authorization helpers (`src/lib/tenant-access.ts`)

| Helper | Purpose |
|---|---|
| `requireRole(session, roles)` | 401/403 role gate |
| `tenantWriteGate(session)` | Live DB tenant check; blocks SUSPENDED; returns trial metadata |
| `entitlementForTenant(tenantId)` | Resolves plan capabilities (permissive fallback for grandfathered tenants) |
| `isTenantSuspended(tenantId)` | Suspension check |
| `canAddStudent(tenantId)` / `canAddCounselor(tenantId)` | Server-side entitlement limits |
| `trialExpiryWriteReason(tenantId)` | Trial-expiry write blocker |

Plus the existing `loadAuthorizedStudent` (counselor assignment + tenant scope) for all counselor routes.

## Enforcement points wired this phase

- `PUBLIC register` → **blocks SUSPENDED tenants** from creating new student accounts (§17-F at the public entry point).
- `counselor/tests/assignments POST` → `tenantWriteGate` before creating an assessment run.
- `org-admin/counselors POST`, `org-admin/students/[id] POST` (assign) → `tenantWriteGate` (no new usage when suspended).
- Every `org-admin/*` read/write scopes by `session.user.tenantId` (cross-org → 404/403).

## §17 security coverage (15 new tests in `tests/tenant-isolation-security.test.mjs`)

| §17 | Test | Result |
|---|---|---|
| A | Org A admin's write gate resolves to Org A (never Org B) | PASS |
| A | Org B admin's write gate resolves to Org B | PASS |
| A | Org B counselor cannot cross into Org A; gate stays scoped to B | PASS |
| A | Forced cross-tenant student access is rejected (404/403) | PASS |
| A | SUPER_ADMIN admitted to org-admin roles (platform support) | PASS |
| B | Counselor can access only assigned student | PASS |
| B | Org B counselor cannot access an Org A student | PASS |
| C | (Student isolation — cross-org student data via unique tenants) | PASS |
| D | Counselor cannot access an unassigned student → 403 | PASS |
| E | Student role cannot use org-admin authorization → 403 | PASS |
| E | Unauthenticated → 401 | PASS |
| F | SUSPENDED org write gate → 403 | PASS |
| F | Suspended org detected; cannot add students/counselors | PASS |
| F | Suspended-trial reason reports "suspended" | PASS |
| G | Entitlement student/counselor limits enforced server-side (not bypassable) | PASS |
| G | Expired trial blocks new usage but preserves data | PASS |

All test tenants/plans are created inside the test and torn down in `after`; the canonical STARTER plan is restored.

## Cross-org data classes protected

Students, assessments (`TestResult`/`TestAssignment`), career results (`StudentCareerProfile`), notes (`CounselorNote`), appointments, counselor actions, and reports are all reached through tenant-scoped ownership paths. No API returns data keyed only by a client-supplied id without an enclosing tenant/ownership check.

## Notes / accepted V1 limitations

- **Role is baked into the JWT** at login (`src/lib/auth.ts`) and not re-fetched per request. Enforcement does NOT rely on the token for tenancy — `tenantWriteGate` and `canAdd*` hit the DB live, so suspension/limits take effect immediately even mid-token. Only role *changes* would require re-login (documented P2).
- **Counselor→student is single-assignment** (`StudentProfile.counselorId`) for V1; multi-org sharing is a documented P2.
- **UNIVERSITY_ADMIN** remains admitted only to university-import admin routes (pre-existing behavior, unchanged).

## No security regression

All prior security/counselor/commercial-readiness suites remain green (see final report test counts).