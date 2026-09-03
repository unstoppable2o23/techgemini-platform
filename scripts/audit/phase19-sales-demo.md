# Phase 19 — Sales Demo Report

**Date:** 2026-09-03

## Demo organization `scripts/seed-phase19-demo-org.js`

Creates **"TechGemini Demo School"** (slug `techgemini-demo-school`), clearly synthetic and safe for sales demonstrations:

| Entity | Detail |
|---|---|
| Status / plan | `ACTIVE`, `PROFESSIONAL` (paid, non-trial) — never hits trial limits |
| Org admin | `admin@demo.techgemini.local` |
| Counselors | `counselor1@demo.techgemini.local`, `counselor2@demo.techgemini.local` (titled) |
| Students | 5 synthetic students (`student1..5@demo.techgemini.local`) across grades 10–12 |
| Assessment results | Synthetic `TestResult` records per student |
| Career profiles | Synthetic `StudentCareerProfile` (completeness ~85%, level COMPLETE) with signals |
| Branding | `brandName`, `logoUrl`, `primaryColor`/`accentColor` via existing `Tenant` branding |
| Demo marking | contact `[DEMO]`, `@demo.techgemini.local` emails |

Idempotent — reuses the tenant if it already exists (re-run safe for prod).

## Commercial CTA (§11)

Clean conversion paths (no giant CRM), all in `src/app/api/commercial/`:

| Endpoint | Purpose |
|---|---|
| `POST /api/commercial/trial` | **START TRIAL** — creates a TRIAL org + ORGANIZATION_ADMIN user + TRIAL subscription (14d). Rate-limited (5/10min). Enforces password ≥ 8, no enumeration. |
| `POST /api/commercial/request-demo` | **REQUEST DEMO / CONTACT SALES** — lightweight acknowledgment (no DB write, no email); rate-limited, input-truncated. |

`BOOK COUNSELOR` reuses the existing appointment architecture (`Appointment` model + `appointments` routes).

## Sales workflow (§13) — verified end-to-end

```
Public Landing Page  (existing, sales-ready)
  → Request Demo / Start Trial  (/api/commercial/request-demo, /api/commercial/trial)
  → Organization Created  (TRIAL tenant, org-admin user, subscription)
  → Organization Admin Login  (session; redirected to /org-admin)
  → Counselor Created  (/org-admin → Org Admin ≥ counselors)
  → Student Created / Assigned  (/org-admin → students; assign counselor)
  → Assessment  (counselor assign → student completes)
  → Career Recommendations  (engine — FROZEN, unchanged)
  → Program Recommendations  (existing program catalog)
  → University Recommendations  (existing university/institution catalog)
  → Counseling Follow-up  (notes / actions / feedback)
```
**No dead ends.** Every step maps to an existing or newly-added functional route. The demo org pre-seeds counselors/students/assessment/career data for a ready-made demonstration.

## Organization branding (§14)

Already supported and reused (not rebuilt): `Tenant` fields `brandName`, `logoUrl`, `primaryColor`, `accentColor`, plus role-gated `GET/PUT /api/tenant/branding`, subdomain→`x-tenant-id` resolution, and `tenant-theme-provider`. Added this phase: `contactName`/`contactEmail`/`contactPhone`. Student/counselor UI keeps TechGemini branding for V1; tenant branding may be layered via the existing provider without a new CMS.

## Human-safety notes for demos

- Demo data is clearly labeled synthetic; `@demo.techgemini.local` domain and `[DEMO]` contact tag make it unmistakable.
- The demo org is on a paid plan, so a live walkthrough never shows trial/entitlement blockers.
- Real student data is never used in a demo; the synthetic org is fully isolated under its own tenant.