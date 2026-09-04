# Phase 22 — Security Review (Customer Operations V1)

**Date:** 2026-09-04
**Scope:** New pilot-ops surface: invitations, CSV import, support, org settings, setup.

## Findings

### 1. Passwords are never transmitted by email
The invitation model is token-based. The student receives a **shared-invite link** (a 256-bit random hex token generated with `crypto.randomBytes(32)`), opens it, and sets their **own** password. Password hashes are computed with **bcrypt cost 12** on accept. No plaintext password ever enters an email or a log path.

### 2. Invitation tokens are single-use and time-limited
- TTL = 7 days (`INVITE_TTL_MS`).
- One active invite per student (`studentId` unique) — a re-invite rotates the token and invalidates the prior link.
- Validate endpoint (`GET /api/invitations/[token]`) returns only non-sensitive data (student name + token state); it never returns the token, hash, or email.
- Statuses enforced: PENDING → ACCEPTED, and non-PENDING tokens (REVOKED / EXPIRED / ALREADY_ACCEPTED) cannot be accepted.

### 3. Tenant isolation on all new routes
- `requireRole(ORGANIZATION_ADMIN|SUPER_ADMIN)` gates org-admin routes; `tenantWriteGate` blocks writes on expired/bad trials.
- All queries scope by `tenantId` resolved from the server session — never from client input.
- Support tickets bind `tenantId` + `userId`; reads are tenant-scoped.
- Verified by tests: a second tenant cannot see the first tenant's invitations; a student belongs to exactly one tenant.

### 4. CSV import validates before persisting
- Rows normalized (aliases, trim, lowercase email).
- Email format regex, missing-name checks, max field length, duplicate (in-file + in-org) prevention.
- Unknown counselor → rejected row (never silently dropped).
- Hard row cap (1000) and student-limit entitlement gate before any create.
- On validation failure (`!sample`), returns 422 with per-row errors and creates **nothing**.
- Failures during create are caught per-row and reported; no partial silent data.

### 5. Settings / setup write validation
- Org branding/settings bear minimal validation (contact fields optional strings, color hex passed through to theme), consistent with existing settings surface.

## Threats reviewed

| Threat | Mitigation | Status |
|---|---|---|
| Stolen invite link used by wrong person | Link is time-limited + single-use; sets the account's own password; no PII in link | OK |
| Password sent over email | Not possible — no password ever emailed | OK |
| Cross-tenant data access | Session-derived tenant scoping + requireRole gate | OK |
| Malformed/duplicate CSV causing bad data | Row validation + dedupe + entitlement gate before create | OK |
| DoS via huge upload | 1000-row cap | OK |
| Brute-force password accept | bcrypt cost 12 hash | OK |

## Raised issues

- **P0:** none.
- **P1:** none.
- Pre-existing (non-security): Corporate Law subject-link assertion fails (engine data test, unrelated to security).

## Sign-off

The new pilot-ops surface introduces **no** password-in-email, **no** cross-tenant exposure, and **no** unsafe bulk writes. **Approved for pilot.**
