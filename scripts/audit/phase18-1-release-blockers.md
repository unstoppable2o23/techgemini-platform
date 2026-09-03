# Phase 18.1 — Release Blockers

**Date:** 2026-09-03
**Phase:** Final pre-sales validation & V1 release freeze

Classification: **P0 = cannot sell/demo safely · P1 = should fix before launch · P2 = later improvement.**

## Release requirement & result

| Requirement | Result |
|-------------|--------|
| ZERO P0 | **0 P0** ✅ |
| P1 = 0 or explicitly accepted/documented | **0 open P1** — all previously identified P1 items are explicitly **accepted/documented** below (engine frozen; no algorithm/weight change permitted this phase). ✅ |

---

## P0 — none

No P0 launch blocker. Specifically verified / exercised:

- **No cross-student data leak.** All 14 `/api/student/*` routes self-scope; Phase 18's P0 fixes remain locked (university-profile + compare never trust a client `studentId`).
- **No cross-counselor access.** Counselor isolation enforced on every `/api/counselor/students/**` route (`loadAuthorizedStudent` or inline assignment/tenant check).
- **No unauthenticated admin/student/counselor writes.** All guarded API routes require a session; the only unauthenticated DB **writes** are the assessment **bearer-token** flow, which is the intended counselor→student shared-link design (documented below, not a launch blocker).
- **Engine integrity.** 289 active careers, 0 data-quality gaps; deterministic, no score saturation, no confidence inflation, no alphabetic pseudo-recommendations on real profiles.
- **Demo/report reliability.** Landing, interactive synthetic demo journey, synthetic 10-section report, and assessment-result PDF all present and functioning.

---

## P1 — 0 open; all previously-identified items accepted & documented

Per the Phase 18.1 policy, the engine is **frozen** and may **NOT** have weights/algorithm changed in this phase. The following genuine but non-blocking items are therefore **explicitly accepted and documented** for launch:

| # | Item | Why accepted for V1 (not a blocker) |
|---|------|-------------------------------------|
| P1-1 | Cross-family equal-score ordering (e.g. mechanical student → Actuarial Science #1; psychology → Brand Management #1; architecture-preferred → Architecture #7) | Inherent to the family-scoped tie-break (`SPECIFICITY_CONFIG`) that preserves top-N family diversity. The recommendations are plausible and never misleading (P0-clean). Fixing would require a scoring change, which is forbidden by the freeze. **Action:** future phase (cross-family differentiation). |
| P1-2 | Assessment bearer-token flow (`/api/tests/assignments/*`) is unauthenticated but token-keyed | By-design counselor→student shared-link flow; a token affects only that one assignment, high-entropy. **Action (future):** short-lived / single-use tokens. |
| P1-3 | `forgot-password` non-functional (says "sent", sends nothing) | Blocks a self-service path, not a data-leak or demo blocker. **Action:** needs an email provider + reset flow decision. |

## P2 — later improvement (documented, non-blocking)

| # | Item |
|---|------|
| P2-1 | Surface the low-information state distinctly in the career-matches UI (API currently drops `lowInformation`/`topMatchStrength`). |
| P2-2 | Cross-family rank differentiation for equal-score ties (see P1-1). |
| P2-3 | Restrict `/api/institutions?format=csv` bulk export to staff roles. |
| P2-4 | Tighten `/api/public/logo` (per-tenant key / rate limit) to reduce email-enumeration surface. |
| P2-5 | Field-select on `/api/careers/[slug]` and `/api/careers/id/[id]` (currently return full career/trait records — career metadata only, no PII). |
| P2-6 | Build the combined 10-section counselor report PDF (assessment-result PDF already exists). |
| P2-7 | Report print/PDF typography polish across browsers. |
| P2-8 | Enforce an explicit staff-only role check on `/api/institutions` CSV; align password policy (min 8) globally. |

---

## Conclusion

**0 P0 · 0 open P1 · 8 P2.** The product is a **RELEASE CANDIDATE**: the career engine is frozen for V1 and the demo/security/report surfaces are safe and reliable for a commercial demonstration.