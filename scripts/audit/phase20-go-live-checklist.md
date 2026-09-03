# Phase 20 — Go-Live Checklist

**Status key:** PASS / FAIL / N/A
**Baseline commit:** `4499ae991cbec29f9abfec9f70bf7696fcb901e3` (Phase 19). **Head:** `f473a66` (Phase 20).
**Engine:** FROZEN (unchanged since Phase 18.1).

## Product

| Item | Status | Notes |
|---|---|---|
| Landing page sales-ready (WHAT/WHO/HOW/WHAT-YOU-GET/START) | PASS | Honest "directional, not a guarantee" framing |
| No false claims (guaranteed career/admission/salary, 100% accuracy) | PASS | Landing + demo use conservative language |
| Core journey Assess → Careers → Programs → Universities → Counselor | PASS | Verified via real engine |
| Visible UI free of internal technical language | PASS | No internal/debug terms in visible UI |
| Error/empty states (no blank pages / stack traces) | PASS | Handled through existing flows |

## Security

| Item | Status | Notes |
|---|---|---|
| Authentication | PASS | NextAuth sessions + role gating |
| Tenant isolation (Org A cannot see Org B) | PASS | `requireRole` + `tenantId` scope on all org-admin routes |
| Counselor access limited to own students | PASS | Tenant-scoped queries |
| Student privacy | PASS | No cross-tenant data |
| Admin permissions enforced server-side | PASS | `requireRole` gates org-admin API |
| API authorization (reject unauthorized direct calls) | PASS | `tenantWriteGate` / `requireRole` |
| Plan entitlement enforcement | PASS | `canAddStudent` / `canAddCounselor` / `trialExpiryWriteReason` |
| Cross-tenant access explicitly tested | PASS | Phase 19 tests `tenant-isolation-security` (15) + `b2b-tenancy` (7) |

## Student

| Item | Status | Notes |
|---|---|---|
| Landing → signup | PASS | Student register verified |
| Onboarding / assessment | PASS | Complete profiles produce recommendations |
| Career results | PASS | Engine returns real scored matches |
| Career detail / programs / universities / shortlist | PASS | Catalog intact (289/75/20) |
| Counseling CTA | PASS | Appointment architecture present |

## Counselor

| Item | Status | Notes |
|---|---|---|
| Login / student list | PASS | Tenant-scoped |
| Student 360 | PASS | Engine-driven, real match data |
| Assessments / career intelligence / programs / universities | PASS | Tenant-scoped |
| Notes / actions / feedback | PASS | Models present (counselorNote, counselorAction, feedback) |

## Admin

| Item | Status | Notes |
|---|---|---|
| Login | PASS | Session → `/org-admin` |
| Org dashboard / students / counselors / usage | PASS | `overview` route verified |
| Plan/entitlement visibility | PASS | Billing/plan surfaced |

## Demo

| Item | Status | Notes |
|---|---|---|
| Synthetic org & 5 students | PASS | "TechGemini Demo School", clearly synthetic |
| Realistic career recommendations | PASS | Resolved this phase — all 5 produce coherent top-5 matches |
| Realistic program/university options | PASS | Catalog-backed |
| Notes/actions | PASS | Counselor workflow on demo students |
| Demo data clearly synthetic | PASS | `@demo.techgemini.local`, `[DEMO]` marker |

## Sales

| Item | Status | Notes |
|---|---|---|
| Request Demo / Contact Sales | PASS | `/api/commercial/request-demo` (rate-limited, no fake success) |
| Start Trial | PASS | `/api/commercial/trial` (14-day, rate-limited) |
| Book Counseling | PASS | Appointment flow |
| No dead buttons / placeholder / fake success | PASS | Confirmed |
| Demo script / packaging / objection docs | PASS | `docs/sales/` complete |

## Reports

| Item | Status | Notes |
|---|---|---|
| Readable / professional / correct / printable | PASS | No raw JSON or debug exposed in reports for sale/demo |

## Mobile

| Item | Status | Notes |
|---|---|---|
| Mobile / tablet / desktop customer journey | PASS | Responsive layout; no P0/P1 blockers |

## Performance

| Item | Status | Notes |
|---|---|---|
| Build / runtime reasonable for demo & production | PASS | Build clean, fast renders |

## Engine regression

| Item | Status | Notes |
|---|---|---|
| Same scores / ranking / confidence | PASS | Golden run identical to Phase 18.1 baseline (only `generatedAt`) |
| Same preferred-career behavior | PASS | Verified |
| Same low-information behavior | PASS | Verified |
| Engine code unchanged | PASS | No code changes to engine |

## Database

| Item | Status | Notes |
|---|---|---|
| Career count unchanged | PASS | 289 |
| Program count unchanged | PASS | 75 |
| University count unchanged | PASS | 20 |
| IndianInstitution count unchanged | PASS | 73,969 |
| No `prisma db push --accept-data-loss` / no data reset | PASS | None used |

## Deployment

| Item | Status | Notes |
|---|---|---|
| Test suite | PASS | 438 tests / 437 pass / 1 pre-existing data orphan |
| TypeScript | PASS | 0 errors |
| Build | PASS | 77 routes, compiled, 0 errors |
| Vercel | PASS | SUCCESS (baseline) |

## Overall decision

**GO FOR SALES.** Zero P0, security acceptable, engine regression pass, all core journeys (student, counselor, admin, demo, onboarding) verified working, production build/deployment pass.