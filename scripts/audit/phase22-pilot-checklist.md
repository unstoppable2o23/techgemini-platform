# Phase 22 — Pilot Launch & Customer Operations V1 — Pilot Checklist

**Date:** 2026-09-04
**Status:** GO FOR PILOT (no P0)

## Legend
- [x] done and verified
- [ ] not done / blocked

## Customer onboarding (org setup)

- [x] Organization provisioning path exists (`POST /api/commercial/trial` + manual TRIAL/PROFESSIONAL tenant).
- [x] Guided setup wizard (5 steps: organization, counselors, students, configure, launch) with progress tracking.
- [x] Setup progress API (`GET /api/org-admin/setup`) reports done flags + completed steps.
- [x] Organization / branding settings API (`PUT /api/org-admin/settings`): contact name/email/phone, brand name, primary/accent colors, logo URL.
- [x] Org-admin dashboard renders Setup banner, pilot metrics, Import CSV, and per-student Invite.

## Counselors

- [x] Counselor accounts can be added under an organization (`org-admin` counselor route, `canAddCounselor` entitlement).
- [x] Counselors review students via the student 360 view (existing Phase 18 journey).

## Students (import + invitations)

- [x] CSV bulk import (`POST /api/org-admin/students/import`) — header aliases, per-row validation, in-file + in-org duplicate prevention, unknown-counselor rejection, max-rows guard (1000), student-limit entitlement check, sample (dry-run) mode.
- [x] CSV validation extracted to pure, tested module (`src/lib/csv-import.ts`).
- [x] Invitation token service (`src/lib/invitation.ts`): 256-bit random hex token, 7-day TTL, single active invite per student.
- [x] Re-invite regenerates the token and invalidates the previous link.
- [x] Invitation validate endpoint (`GET /api/invitations/[token]`) — returns valid + student name, or NOT_FOUND / ALREADY_ACCEPTED / REVOKED / EXPIRED.
- [x] Invitation accept endpoint (`POST /api/invitations/[token]/accept`) — sets the student's own bcrypt-hashed password (cost 12), activates the account, marks ACCEPTED.
- [x] Public accept page `/invite/[token]` (loading / error / expired / form / success states).
- [x] No passwords are ever transmitted by email; only a tokenized link.

## Support

- [x] Support ticket API (`POST /api/support`) with category HELP | PROBLEM | CONTACT; tenant + user captured; default status OPEN.
- [x] Support page `/support` + in-app **Help & Support** entry in the user menu (all roles) and student More sheet.
- [x] Tickets are tenant-scoped (backend `requireRole` + tenant wiring).

## Pilot metrics & billing visibility

- [x] Overview API exposes `pilotMetrics`: career results, roadmaps created, follow-ups required, students with shortlisted universities, invitations pending/accepted.
- [x] Dashboard renders the pilot metrics grid.

## Tenant isolation

- [x] All new reads/writes are scoped to the session tenant (`requireRole`, `tenantWriteGate`).
- [x] Test: a second tenant cannot see the first tenant's invitations.
- [x] Test: a student belongs to exactly one tenant.
- [x] Full Phase-19 tenant-isolation suite still passes (`tests/tenant-isolation-security.test.mjs`, `tests/b2b-tenancy.test.mjs`).

## Demo path

- [x] Demo org present and ACTIVE on PROFESSIONAL plan: **TechGemini Demo School** (slug `techgemini-demo-school`).
- [x] `/demo` path exists for public demonstration.

## Documentation

- [x] `docs/customer/org-admin-guide.md` updated (setup wizard, CSV import, invitations, Help & Support).
- [x] `docs/customer/onboarding-checklist.md` updated for the wizard / CSV / invite flows.
- [x] `docs/customer/counselor-guide.md`, `docs/customer/student-guide.md`, `docs/customer/demo-user-guide.md` present.
- [x] `docs/sales/pilot-onboarding-script.md` added; `demo-script.md`, `objection-handling.md` present.

## Verification (regression / DB / build)

- [x] Full test suite: **515 tests, 514 pass, 1 pre-existing fail** (Corporate Law subject-link path — unrelated to pilot ops).
- [x] Phase-22 test file added: `tests/phase22-pilot-ops.test.mjs` (13 pass: CSV import, invitation lifecycle, support tickets, tenant isolation).
- [x] TypeScript: `npx tsc --noEmit --skipLibCheck` → 0 errors.
- [x] Build: `npm run build` → Compiled successfully.
- [x] Engine-freeze regression: byte-identical (628,407) — zero recommendation changes.
- [x] DB counts unchanged: Career 289, Program 75, University 20, IndianInstitution 73969, AcademicProgram 242.
- [x] No `prisma db push --accept-data-loss` used; new tables added only.
- [x] Program audit: 75 verified, 0 missing sources, 0 duplicate groups, 0 dangling refs.
- [x] Institutions invariant: 0 violations.

## Blockers / P0

- [ ] **None.** Zero P0 or P1 issues found.
