# Phase 22 — Customer Onboarding Report

**Date:** 2026-09-04

## What a customer administrator now experiences

1. **Provision** — TechGemini creates the organization (trial or paid plan) and the org-admin account.
2. **Setup wizard** (5 steps) — org name + branding → counselors → students → configure → launch, with a progress indicator. Steps are remembered if the admin leaves and returns.
3. **Add the cohort** — via bulk **CSV import** (validated per row, dedupe, clear errors) or manual add.
4. **Invite students** — each student is sent a secure 7-day invitation link and sets their own password; the dashboard shows pending/accepted so the admin can chase inactivates.
5. **First use** — students produce career recommendations, study pathways and university options; counselors guide via the student 360 view; sessions + follow-up notes.
6. **Support** — in-app Help & Support from the user menu.

## Deliverables mapped to spec

| Spec doc | File | Status |
|---|---|---|
| quick-start / org admin guide | `docs/customer/org-admin-guide.md` | updated (setup wizard, import, invite, support) |
| counselor guide | `docs/customer/counselor-guide.md` | present |
| student guide | `docs/customer/student-guide.md` | present |
| demo user guide | `docs/customer/demo-user-guide.md` | present |
| onboarding checklist | `docs/customer/onboarding-checklist.md` | updated |
| pilot onboarding script | `docs/sales/pilot-onboarding-script.md` | added |
| demo script / objection handling | `docs/sales/demo-script.md`, `objection-handling.md` | present |

## Key flows verified

- Setup progress API returns accurate done/completed steps (integration via dashboard).
- CSV import normalizes headers, rejects bad rows, prevents duplicates, assigns counselors by email.
- Invitation create → validate (valid) → accept (sets bcrypt password, activates user, marks ACCEPTED).
- Re-invite rotates the token; accepted invitation cannot be accepted again.
- Support ticket created tenant-scoped with status OPEN.
- **13 automated tests** in `tests/phase22-pilot-ops.test.mjs` cover these flows end-to-end against the real schema.

## Demo

- Demo org **TechGemini Demo School** is ACTIVE on the PROFESSIONAL plan (no trial-limit friction during demos).
- `/demo` public path present; sales script guides demonstration.

## Signal

The pilot cohort can be stood up end-to-end: provision → wizard → CSV import → invite → students active → counselors supporting → support/contact. **Onboarding is pilot-ready.**
