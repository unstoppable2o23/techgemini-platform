# Phase 19 — Entitlements Report

**Date:** 2026-09-03

Server-side subscription / plan / trial architecture. Limits are enforced by the API, never by the frontend alone; clients only render state.

## Models (`prisma/schema.prisma`)

### `SubscriptionPlan`
```
id, name, planType (PlanType @unique), maxCounselors, maxStudents,
hasReports, hasUniversityRecommendations, hasCounselorFeatures,
trialDays?, isActive, createdAt, updatedAt
```

### `Subscription`
```
id, tenantId (@unique → Tenant, onDelete Cascade), planId → SubscriptionPlan,
status (SubscriptionStatus), startedAt, endsAt?, createdAt, updatedAt
```

### Enums
- `PlanType`: `TRIAL | STARTER | PROFESSIONAL | ENTERPRISE`
- `SubscriptionStatus`: `ACTIVE | TRIAL | EXPIRED | CANCELLED`
- `TenantStatus`: `ACTIVE | SUSPENDED | TRIAL`

## Canonical plans (seeded by `scripts/seed-phase19-b2b.js`)

| Plan | maxCounselors | maxStudents | Reports | Univ recs | Counselor features | trialDays |
|---|---|---|---|---|---|---|
| Trial | 1 | 25 | yes | yes | yes | 14 |
| Starter | 2 | 100 | yes | yes | yes | — |
| Professional | 10 | 1000 | yes | yes | yes | — |
| Enterprise | 100 | 100000 | yes | yes | yes | — |

Plans are **configurable data** — pricing/limits are not hard-coded in the recommendation engine, and nothing in the engine reads plan type. Core recommendation quality is NOT reduced by any plan tier (§8: "Do not artificially restrict core recommendation quality by subscription tier").

## Server-side enforcement (`src/lib/tenant-access.ts`)

- `canAddStudent(tenantId)` → `{ ok, max, existing }` — refuses NEW student when `existing >= plan.maxStudents` or tenant SUSPENDED.
- `canAddCounselor(tenantId)` → same for counselors.
- `entitlementForTenant(tenantId)` → returns plan caps; **permissive fallback** (PROFESSIONAL-like, no cap) if no subscription is provisioned, so grandfathered/pre-existing tenants are never accidentally gated.
- `tenantWriteGate(session)` → blocks SUSPENDED tenants from ALL new usage; returns trial metadata.
- `trialExpiryWriteReason(tenantId)` → returns a block reason when a TRIAL tenant's window has ended (or when suspended), else null.

## Enforcement call sites

| Caller | Gate |
|---|---|
| `org-admin/counselors POST` | `canAddCounselor` + `tenantWriteGate` (409 on limit / 403 on suspended) |
| `org-admin/students/[id] POST` (assign) | `tenantWriteGate` |
| `/api/auth/register` (public student signup) | SUSPENDED block (403) |
| `tests/assignments POST` | `tenantWriteGate` |

## Trial behavior

- New org: `status=TRIAL`, `planType=TRIAL`, `trialStartedAt=now`, `trialEndsAt=now+14d`, `Subscription(status=TRIAL, endsAt=now+14d)` — created by `POST /api/commercial/trial`.
- **On expiration:** new usage that would exceed the trial plan is blocked (via `canAdd*`/`trialExpiryWriteReason`); **all existing student data is preserved**; the org-admin Plan & Billing view shows an `UPGRADE` / "Contact Sales" action. No data deletion.
- Grandfathered tenants (pre-existing from earlier phases) were backfilled to `status=ACTIVE` with a `PROFESSIONAL` plan and an `ACTIVE` subscription so nothing is blocked.

## Billing/usage surface (`src/app/api/org-admin/billing`)

Returns plan caps, current usage vs. limit (`atLimit`), subscription status, trial ends, and a recommended action (`UPGRADE`/`ACTIVE_TRIAL`/`ACTIVE`) for the UI to render. Read-only.

## No payment gateway

Integrated **no** payment gateway (spec §8). `PaymentProof` (manual proof-of-payment for counselor sessions) already existed and is unchanged. The plan/Subscription abstraction is gateway-ready.