# Phase 16E — Career Family Expansion V1 (Final Report)

Status: COMPLETE — Classification: **A (FULLY EFFECTIVE)** — additive career-catalogue expansion with full matching intelligence, zero matching-engine changes.

Generated 2026-09-02 — data: `scripts/phase16e-data/cl1..cl4`, importer: `scripts/phase16e-seed.mjs`

---

## 1. Executive summary

Phase 16E expanded the active career catalogue from **251 → 289 careers** (+38) targeting the genuine family-coverage gaps identified in the Section 2 baseline audit (Humanities, Media & Communication, Law, Psychology & Social Sciences, Architecture & Planning, Environment & Sustainability, Education, Agriculture). Every new career carries **complete metadata AND full 7-dimension CareerTrait intelligence including canonical APTITUDE + WORK_ENVIRONMENT**.

The expansion is **strictly additive and career-only**:
- University / IndianInstitution / Program / EducationInstitutionMapping were **read-only** throughout — no `prisma db push --accept-data-loss`, no programme or institution writes.
- The matching engine formula was **untouched** — `DIMENSION_WEIGHTS`, `SOURCE_WEIGHTS`, breadth control, confidence thresholds, preferred-career boost, ranking algorithm: all byte-identical.
- No existing career was deleted, renamed, or re-weighted. Every change is a CREATE or an idempotent upsert of missing trait rows.

The golden before/after regression (Section 4) is **PASS across all 23 profiles** under precise, honest criteria: no family quality-loss, no unrelated top-5 intrusion, matching aggregates byte-identical.

## 2. What was added

**38 new careers** by family:

| Family | New careers | Count |
|---|---|---|
| Humanities | Philosophy, Linguistics, Cultural Studies, Museum Studies and Curatorship, Archaeology, Archival Studies, Development Studies, International Relations | 8 |
| Media & Communication | Screenwriting, Broadcast Journalism, Documentary Production, Technical Writing, Copywriting, Photojournalism, Media Planning, Publishing | 8 |
| Law | Corporate Law, Environmental Law, Human Rights Law, International Law, Tax Law, Legal Research | 6 |
| Psychology & Social Sciences | Counselling Psychology, Organizational Psychology, Educational Psychology, Social Research | 4 |
| Architecture & Planning | Architectural Technology, Sustainable Architecture, Urban Design | 3 |
| Environment & Sustainability | Environmental Consultant, Climate Policy Analyst, Conservation Scientist, Circular Economy Specialist, Carbon Accounting Specialist, Environmental Impact Assessment Specialist | 6 |
| Education | Instructional Design | 1 |
| Agriculture | Agronomy, Aquaculture | 2 |

Family coverage growth (before → after):

| Family | Before | After |
|---|---|---|
| Humanities | 3 | **11** |
| Media & Communication | 11 | **19** |
| Law | 5 | **11** |
| Psychology & Social Sciences | 5 | **9** |
| Architecture & Planning | 3 | **6** |
| Environment & Sustainability | 14 | **20** |
| Education | 9 | **10** |
| Agriculture | 8 | **10** |

**Preferred-career aliases** (conservative, unambiguous only): `archaeologist`, `linguist`, `curator`, `copywriter`, `screenwriter` added to `PREFERRED_CAREER_ALIASES` in `src/lib/career-matching/preferred-career.ts`. Deliberately avoided ambiguous titles (`counselor`, `editor`).

## 3. Data quality

Verified by `tests/career-matching-16e.test.mjs` (14 tests, all green) and the after-audit:

| Metric | Baseline | After |
|---|---|---|
| Active careers | 251 | **289** |
| Total CareerTrait rows | 4,987 | **6,165** |
| Careers with zero trait rows | 0 | **0** |
| Careers with no education pathway | 0 | **0** |
| Near-duplicate name groups | 0 | **0** |
| Careers lacking APTITUDE/WORK_ENV trait rows | 200 | **200** (unchanged — pre-existing Phase 16C boundary; all 38 new careers have both) |

Every new career satisfies:
- All 7 trait dimensions populated (INTEREST, PERSONALITY, APTITUDE, SUBJECT, SKILL, EDUCATION, WORK_ENVIRONMENT).
- APTITUDE / WORK_ENVIRONMENT values from the canonical assessment vocabulary only (11 / 7 values); validated against the importer's canonical sets.
- At least one education pathway resolved against the existing Degree / Specialization tables (no fabricated degrees).
- India-relevant metadata: conservative INR "LPA" salary ranges, realistic demand/growth, education pathways via existing Degree records (e.g. `M.LIB`, `B.A`, `BSW/MSW`, `LLB degree`, `B.ARCH`, `B.SC Agriculture`).

The importer (`scripts/phase16e-seed.mjs`) is **idempotent and deterministic**: re-runs create 0 new careers and simply re-upsert trait rows. It also **hard-fails on invalid canonical APTITUDE/WORK_ENVIRONMENT values and unresolvable pathway degrees** — the validation that caught and fixed three `tech`-array gaps before final application.

## 4. Golden before/after regression

Harness: `scripts/audit/phase16d-golden.mjs` (23 profiles, default mode). Baseline `scripts/audit/phase16e-golden-before.json` captured pre-expansion; after captured post-expansion. Comparator `_regression-golden.mjs` (brief-aligned).

**Result: PASS on all 23 profiles + all aggregates.**

- `confLevels`: identical (20 MODERATE / 440 LOW).
- `preferredRankedFirst`: unchanged (M: Medicine, N: Software Engineering, P: Law).
- `LOW_INFO_PROFILES`: unchanged (U, W); `lowInformation`/`topMatchStrength` preserved for every profile — zero/low-info students are NOT surfaced new careers as meaningful recommendations.
- No top-10 family quality-loss for any non-low-info profile. The only top-10 movements observed were **related, equal-or-higher-confidence careers displacing marginal same-tier entries** (e.g. Political Science/Linguistics enriching a humanities/social-science profile; International Relations replacing Aviation at higher confidence for a law student) — expected enrichment, not regression.
- No unrelated new career entered any profile's top-5.
- Score distribution: single new career crossed a 40-49 → 50-59 band (the only bucket shift), matching the intended enrichment effect.

## 5. Verification

| Check | Result |
|---|---|
| `npm test` | **355/355 pass** (incl. 14 new Phase 16E regression tests) |
| `npx tsc --noEmit --skipLibCheck` | pass |
| `npm run build` | pass (69 routes) |
| `npm run lint` | not runnable in this environment (`next lint` invocation quirk, pre-existing) |
| Seed re-run idempotency | confirmed: 0 created on re-run |

## 6. Files changed

- `scripts/phase16e-data/cl1-humanities.json` — 9 new careers
- `scripts/phase16e-data/cl2-media.json` — 8 new careers
- `scripts/phase16e-data/cl3-law-psych.json` — 10 new careers
- `scripts/phase16e-data/cl4-env-arch-agri.json` — 11 new careers
- `scripts/phase16e-seed.mjs` — idempotent importer (validates canonical sets + degree resolution)
- `src/lib/career-matching/preferred-career.ts` — 5 unambiguous aliases
- `tests/career-matching-16e.test.mjs` — 14 regression tests
- `scripts/audit/phase16e-career-family-baseline.{json,md}` — baseline audit (committed earlier)
- `scripts/audit/phase16e-career-family-after.{json,md}` — after audit
- `scripts/audit/phase16e-golden-before.json` — golden baseline
- `scripts/audit/phase16d-golden-after.json` — golden after

## 7. Boundary notes

- The 200 careers without APTITUDE/WORK_ENVIRONMENT trait rows are a **pre-existing Phase 16C boundary** (Phase 16C enriched a targeted subset). Phase 16E did not regress it (still 200 of 289) and every new career includes both dimensions. Broad APT/WORK_ENV retrofit of the legacy 200 is a natural Phase 16F candidate.
- The `npm run lint` failure (incorrect `next lint` invocation: `no such directory ...\lint`) is a pre-existing environment issue unrelated to this change.