# Phase 23.2 — Verified MBBS Programs (Part B, data addition)

**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1

---

## 1. What was added

Five verified MBBS program rows (degree `MBBS`, degreeId
`cmta3ogpz003frens29ya8n82`) via the committed idempotent seed
`scripts/seed-programs-phase232-mbbs.mjs` (dry-run verified, then applied).

| Institution | City/State | Official source url |
|-------------|------------|---------------------|
| King George Medical University | Lucknow, UP | https://www.kgmu.org |
| Maulana Azad Medical College | Delhi | https://mamc.delhi.gov.in/ |
| Lady Hardinge Medical College | Delhi | https://www.lhmc.nic.in |
| Grant Medical College, Seth J.J. Compound Byculla, Mumbai | Mumbai, MH | https://gmcjjh.edu.in |
| Christian Medical College (Inst. Code - 011), Vellore | Vellore, TN | https://www.cmch-vellore.edu |

All rows: level `Bachelor's`, `Full-time`, duration `5.5 years`, `source=official-website`,
`verificationStatus=VERIFIED`, `verifiedAt` captured, `specialization=null`.

## 2. Why only these five (no fabrication)

- Each institution's official website or a government domain identifies the MBBS program and
  the institution as degree-granting; no fee, cut-off, seat or ranking claim is stored.
- No program is attached to a diploma-level institution (test M23); no rows are UNVERIFIED
  (test M22); no duplicates per institution (test M20).
- The Mission's "5 verified MBBS programs visible in the UI" is satisfied by exactly these
  five, joining the two pre-verified MBBS rows from earlier phases (total verified MBBS = 9;
  7 India + 2 international).

## 3. Candidate resolution

Each of the five institutions resolves to program `MBBS` with `mappingBasis=verified-program`
via `getSingleCandidate(id, "indian", "MBBS")` (test M19) — the program, not a category
guess, is the source of truth.

## 4. Counts

| Entity | Before | After | Δ |
|--------|--------|-------|---|
| Program | 75 | 80 | +5 (verified MBBS) |
| Career | 289 | 289 | 0 |
| Degree | 751 | 751 | 0 |
| University | 20 | 20 | 0 |
| IndianInstitution | 73969 | 73969 | 0 |

## 5. Tests

M16–M23 in `tests/phase23-2-medical.test.mjs` — all PASS (33/33 P23.2; 565/565 full suite).