# Phase 22 — Demo Validation Report

**Date:** 2026-09-04

## Demo organization

- **Name:** TechGemini Demo School
- **Slug:** `techgemini-demo-school`
- **Plan:** PROFESSIONAL (paid-path demo — never hits trial limits)
- **Status:** ACTIVE

## Public demo path

- `/demo` route exists (marketing/marketing chrome suppressed on `/demo`).
- Marketing pages (`/`, `/demo/*`, `/auth/*`) render their own header, not the app shell.

## Pilot-ops demo flow

The pilot onboarding script (`docs/sales/pilot-onboarding-script.md`) demonstrates end-to-end:

1. **Provision** — show an org account on the Admin dashboard with the Setup banner.
2. **Setup wizard** — walk the 5 steps and watch progress fill.
3. **CSV import** — upload a sample cohort; show per-row errors for a deliberately bad row, then a clean import.
4. **Invitations** — invite a student, show the link (7-day, single-use), accept and confirm status flips to accepted + account active.
5. **Student journey** — profile → recommended careers → study pathways → universities → counselor session.
6. **Support** — raise a help ticket from the user menu; confirm it is tracked under the org.
7. **Pilot metrics** — show the Overview pilot metrics grid (career results, roadmaps, follow-ups, shortlists, invitations).

## Verification

| Item | Result |
|---|---|
| Build with demo + pilot routes | Compiled successfully |
| Phase-22 tests | 13/13 pass |
| Tenant isolation tests | pass |
| Demo org present & ACTIVE | confirmed |

## Verdict

The demo path is coherent and reproducible for sales and pilot onboarding. **PASS.**
