# Phase 19 — B2B & Commercial Readiness V1

**Date:** 2026-09-03
**Baseline commit:** `454d063` (Phase 18.1)
**Scope:** Make TechGemini commercially usable as a B2B product (schools / colleges / counseling orgs / independent counselors / consultancies), without changing the frozen career engine.

## Engine freeze (per phase spec)

The career matching engine is **FROZEN**. No weights, no assessment scoring, no career-database expansion, no University/IndianInstitution/Program changes. This phase added ONLY commercial/tenant infrastructure.

## What was built (summary)

| Deliverable | Where |
|---|---|
| Tenant/Organization model | Extended existing `Tenant` model (status, contact info, plan, trial fields) — **no duplicate organization table** |
| Roles | Added `ORGANIZATION_ADMIN` to `Role`; centralized tenant-scoped guards |
| Data isolation | Central helpers `requireRole` / `tenantWriteGate`; existing `loadAuthorizedStudent` remains the counselor-scope primitive |
| Subscription abstraction | New `SubscriptionPlan` + `Subscription` models (configurable limits, no payment gateway) |
| Entitlement enforcement | `canAddStudent` / `canAddCounselor` / `entitlementForTenant` (server-side only) |
| Trial mode | `Tenant.status` + `trialEndsAt` + `trialExpiryWriteReason` gate (preserves data) |
| Org-admin experience | `/org-admin` dashboard (Overview / Counselors / Students / Plan & Billing) backed by `src/app/api/org-admin/*` |
| Commercial CTA | `POST /api/commercial/trial`, `POST /api/commercial/request-demo` |
| Sales demo org | `scripts/seed-phase19-demo-org.js` → "TechGemini Demo School" |
| Backfill | `scripts/seed-phase19-b2b.js` → 4 plans + grandfathered-existing-tenants (ACTIVE + subscription) |
| Build integration | `seed-phase19-b2b.js` + `seed-phase19-demo-org.js` added to `vercel-build` |

## Organization model

Built on the **existing `Tenant` model** (multi-tenancy already existed via `Tenant` + `User.tenantId` NOT NULL cascading FK + subdomain/`x-tenant-id` middleware). Extended it additively:

- `status` — `TenantStatus` (ACTIVE / SUSPENDED / TRIAL)
- `contactName`, `contactEmail`, `contactPhone` — org contact information
- `planType` — `PlanType` (TRIAL / STARTER / PROFESSIONAL / ENTERPRISE)
- `trialStartedAt`, `trialEndsAt` — trial window
- `isActive` (existing), `slug`/`subdomain`/`brandName`/`logoUrl` (existing branding)

`Per §1/§2, a parallel `Organization`/`OrgMember` table was deliberately NOT created — it would duplicate the existing tenant system and risk two tenancy systems.

## Roles

Flat global `Role` enum on `User`, extended with `ORGANIZATION_ADMIN`:
`SUPER_ADMIN, ORGANIZATION_ADMIN, COUNSELOR, STUDENT, UNIVERSITY_ADMIN`.

- A counselor belongs to one organization (`User.tenantId`, cascading) for V1.
- Students belong to an organization via `User.tenantId`.
- Existing users are unchanged and grandfathered ACTIVE.

## Isolation model (§4)

Enforced at the **server/API authorization layer**, not the frontend:

1. `requireRole(session, roles)` — 401/403 gate + role check, reusable everywhere.
2. `tenantWriteGate(session)` — live DB check: 401/404/403, and blocks **SUSPENDED** tenants from any new usage; returns trial metadata for callers.
3. `loadAuthorizedStudent` (existing, reused) — counselor must match assignment AND same tenant; SUPER_ADMIN global bypass.
4. Every `org-admin/*` route scopes queries with `User.tenantId = session.user.tenantId` (cross-org data is 404/403).
5. Public entry points (`register`, test-assignment creation) block SUSPENDED tenants from creating new usage.

Organization A can never see Organization B students / assessments / career results / notes / appointments / actions / reports through any API.

## Subscription / plan model (§8-9)

- `SubscriptionPlan`: id, name, `planType` (unique), `maxCounselors`, `maxStudents`, `hasReports`, `hasUniversityRecommendations`, `hasCounselorFeatures`, `trialDays`, active.
- `Subscription`: tenantId (unique) → plan, status (ACTIVE/TRIAL/EXPIRED/CANCELLED), startedAt, endsAt.
- Plans are **configurable data** — no pricing hard-coded in the recommendation engine.
- **No payment gateway** integrated (per spec). `PaymentProof` (manual proof upload) already existed for per-session counseling payments.
- Server-side entitlement: `canAddStudent` / `canAddCounselor` compute `existing < plan.max` and refuse creation at/over limit; `entitlementForTenant` returns plan capabilities. Clients only render this state.

## Trial behavior (§10)

- New orgs start as `TRIAL` with a 14-day window (`/api/commercial/trial`).
- Trial **expiration** (`trialExpiryWriteReason`): blocks new usage that would exceed entitlement (new students/counselors and suspended-equivalent write gates), **preserves all existing student data**, surfaces an `UPGRADE`/contact action in the org-admin Plan & Billing view.
- No data is deleted on trial end.

## Sales workflow / demo org (§12-13)

Functional end-to-end: Public landing → Request Demo `/api/commercial/request-demo` or Start Trial `/api/commercial/trial` → Organization created (TRIAL, org-admin user, subscription) → Org-admin login → `/org-admin` dashboard → create counselor → create/assign students → assessments → career recommendations → program + university recommendations → counseling follow-up (notes/actions). No dead ends.

**Demo organization:** `scripts/seed-phase19-demo-org.js` creates "TechGemini Demo School" (slug `techgemini-demo-school`), clearly synthetic (contact `[DEMO]`, `@demo.techgemini.local` emails). It contains an ORGANIZATION_ADMIN, two COUNSELORS, five STUDENTS with synthetic assessment results and career profiles, and a **PROFESSIONAL (paid, non-trial)** subscription so sales demos never hit trial limits. All data is explicitly labeled demo/synthetic.

## Branding (§14)

White-label support already exists and is reused: `Tenant.brandName`, `logoUrl`, `primaryColor`, `accentColor` + `GET/PUT /api/tenant/branding` (role-gated) + subdomain resolution + `tenant-theme-provider`. `contactName/Email/Phone` added this phase. No new white-label CMS built (per spec).

## Email / invitation readiness (§15)

**Audit result:** there is **no email/SMTP library or service integration anywhere** (no nodemailer/resend/sendgrid/smtp). Therefore counselor invites, student invites, and password setup/reset are **not yet wired to send real emails** — a documented P2 (a real provider is required; the app currently relies on seeded placeholder passwords / direct account creation). No automated test sends or depends on an email service.

## Data privacy / retention (§16)

- **Who may access student information:** students (own data), their assigned counselor (via `loadAuthorizedStudent`), the org admin within their own tenant (via scoped `org-admin/students`), and SUPER_ADMIN (platform support).
- **Organization isolation:** enforced server-side (see Isolation model).
- **Counselor access boundary:** only assigned students; unassigned students are 403. Assignment is a single counselor per student for V1.
- **Admin access:** ORGANIZATION_ADMIN within own tenant; SUPER_ADMIN global.
- **Deactivation behavior:** `User.isActive=false` / `Tenant.status=SUSPENDED` — **non-destructive**; data is retained and preserved. No irreversible deletion implemented. Tenant deletion is `onDelete: Cascade` in the schema but no destructive delete route is exposed in this phase.

## Security results (§17) — covered in detail in `phase19-tenant-security.md`

15 new server-side isolation tests pass (A–G). Additionally the existing counselor isolation and route-level security suites remain green.

## Deliverables this phase

- `scripts/audit/phase19-b2b-readiness.md`
- `scripts/audit/phase19-tenant-security.md`
- `scripts/audit/phase19-entitlements.md`
- `scripts/audit/phase19-sales-demo.md`
- `scripts/audit/phase19-engine-freeze-regression.md`
- `scripts/audit/phase19-final-report.md`
- `scripts/seed-phase19-b2b.js`, `scripts/seed-phase19-demo-org.js`
- `src/lib/tenant-access.ts`
- `src/app/api/org-admin/**`, `src/app/api/commercial/**`
- `src/app/org-admin/**`
- `tests/tenant-isolation-security.test.mjs`, `tests/b2b-tenancy.test.mjs`
- Prisma schema additions (`Tenant` fields, `SubscriptionPlan`, `Subscription`, `TenantStatus`/`PlanType`/`SubscriptionStatus` enums, `ORGANIZATION_ADMIN` role)