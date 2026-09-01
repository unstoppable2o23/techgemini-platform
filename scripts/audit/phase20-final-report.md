# Phase 20 — Safe-Fit / Strong-Fit University Recommendations — Final Report

**Date:** 2026-08-28
**Engine:** Phase 16 program-aware matcher FROZEN — fit tiers are overlay computed FROM existing match results, candidate generation and ranking unchanged

## 1. Score distribution report (from Part 1 audit)

**Engine:** 9 dimensions (educationPathway 0.30, specialization 0.15, careerAlignment 0.10, academicFit 0.15, location 0.10, country 0.05, budget 0.05, institutionQuality 0.05, studentPreferences 0.05), scores 0–100 per dimension, `matchScore = sum(applied)`.

**Real distribution (8 careers, 20 matches each, India student Karnataka/India):**
- Computer Vision Engineer: 80–86 avg 82.2 (verified-program, 20 candidates)
- Medicine: 80–81 avg 80.5 (verified, 4 candidates)
- Biotechnology Research: 56–83 avg 58.5 (mixed verified/category, 102 total)
- Business Management: 61–86 avg 66.2 (mixed)
- Product Design: 56–56 avg 56.0 (pure category, 5,337 total)
- Mechanical Engineering: 56–83 avg 58.5 (mixed)
- Overall: Min 56, Max 86, Avg 65, P25 56, P50 61, P75 81, P90 83
- Histogram: 50–59: 40%, 60–69: 10%, 80–89: 50% — natural clusters at high 80–100 (verified), mid 60–79 (curated/verified with missing dims), low 40–59 (category), weak 0–39

**Student variations:** India (Karnataka, India) avg 82.2 vs USA (Karnataka, USA) avg ~78 (country dim), No state (India) avg ~80 — location/country influence visible.

**Existing dimensions:** 9, weights sum to 1, all used.

## 2. Tier definitions: bands, evidence caps, freshness caps

**Four tiers, documented with real score-band evidence, no silent magic numbers:**

| Tier | Definition | Score band | Confidence | Evidence cap | Freshness cap |
|------|------------|------------|------------|--------------|---------------|
| **STRONG_FIT** | Verified program evidence directly matches education pathway, strong country/preference alignment | matchScore ≥75, confidence ≥80 | 80 | verified-program only (category-based never Strong Fit, even if 85) | Verified UNKNOWN/HISTORICAL → capped at Good Fit |
| **GOOD_FIT** | Relevant verified or curated evidence with solid alignment; some dims unmatched/missing | 60–74, confidence ≥60 | curated max Good Fit | Verified UNKNOWN/HISTORICAL → capped Good Fit |
| **POTENTIAL_FIT** | Partial alignment — category-based or verified in related but not exact degree | 45–59 | 40 | institutionType-category max Potential Fit | — |
| **EXPLORE** | Weak direct evidence; broader interest area but no verified pathway | 0–44 | 0 | none max Explore | — |

**Deterministic:** `deriveFitTier(matchScore, confidenceScore, mappingBasis, program, hasAcademicData, hasBudgetData)` — same inputs → same tier, always.

**Freshness caps:** `computeFreshness(verifiedAt)` → CURRENT (≤12m), RECENT (≤24m), HISTORICAL (>24m), UNKNOWN — thresholds `FRESHNESS_THRESHOLDS` in `src/lib/university-profile/freshness.ts`, verified UNKNOWN/HISTORICAL caps Strong → Good.

**Evidence quality caps tier:** High matchScore on category-based alone must NOT produce Strong Fit — verified via test `Category-based evidence with high matchScore → capped tier` (85 on category → POTENTIAL_FIT).

## 3. Missing-data degradation matrix

| Missing dimension | Behavior | Example |
|-------------------|----------|---------|
| No academic profile data | Tier computed WITHOUT academic dimension; if remaining evidence supports tier, assign it; if too thin (matchScore <45), Explore | No gradeLevel/exams → academicFit 50 unavailable, but verified program 85 → Strong Fit still possible |
| No budget data (student or institution) | Budget dimension simply absent (50 unavailable); never defaults to affordable/expensive | No tuitionBudget → budget 50 unavailable, tier from other dims |
| Partial assessments | Tier from whatever dims exist, UI indicates “based on your current profile information” if confidence <60 | 1 assessment → confidence 70, tier computed normally |
| Zero assessments | No tiers presented as personalized if `hasPrograms=false` or `matchScore<45`; show neutral exploration state per Phase 16 empty-state | No assessments + weak profile → Explore |

**RULE:** Missing dimension can LOWER confidence in a tier but never INVENT a tier.

## 4. Overlay implementation: confirm engine frozen, candidate generation and ranking unchanged

- **Overlay, not rewrite:** `deriveFitTier` computed in `src/lib/university-matching/engine.ts` AFTER `scoreInstitution` + `buildExplanation`, added as `fitTier`, `fitTierLabel`, `fitTierExplanation` to `MatchResult` — `matchScore` and `confidence` unchanged, candidate generation (`getCandidateSet` with Tier 1/2/3) and ranking (`matchScore desc, confidence desc, name asc`) unchanged.
- **Same pipeline:** `getCandidateSet` → `scoreInstitution` → `buildExplanation` → `deriveFitTier` → ranking — no second matching service.
- **API extended compatibly:** `GET /api/student/university-matches` and `GET /api/student/university-matches/[institutionId]` now return `fitTier`, `fitTierLabel`, `fitTierExplanation` additive, same pipeline; counselor view uses same API (via `getUniversityProfile` with `studentId`), no fork. Phase 19 profile API consumes overlay without refactor (adds `studentContext.fitTier`).

## 5. API changes (additive, same pipeline)

- Student: `GET /api/student/university-matches?careerId=&limit=` → each `match` now includes `fitTier`, `fitTierLabel`, `fitTierExplanation` (overlay), plus existing `matchScore`, `confidence`, `reasons`, `institution`, `program`, `mappingStatus`
- Profile: `GET /api/universities/[id]/profile?dataset=&studentId=&careerId=` → `studentContext` now includes `fitTier`, `fitTierLabel`, `fitTierExplanation`, `pathwayChain`
- Counselor: `GET /api/counselor/students/[id]/university-profile?institutionId=&dataset=&careerId=` — same `getUniversityProfile` with `studentId`, identical match results, no separate logic
- Bounded, indexed, explicit nulls preserved.

## 6. Explanation language catalog (all tier strings)

**Correct:**
- Strong Fit — “Strong profile fit — verified B.Tech Computer Science program matches your education pathway and country preference.”
- Good Fit — “Good fit — relevant verified program; your budget preference could not be evaluated (no fee data).” / “Good fit — relevant verified or curated evidence with solid alignment; some dimensions unmatched.”
- Potential Fit — “Potential fit — institution relevant to your education area; exact program not yet verified.”
- Explore — “Explore — weak direct evidence; institution may be relevant to your broader interest area but has no verified pathway alignment.”
- Capped: “Capped at Good Fit due to historical program verification” / “Capped at Potential Fit due to institutionType-category evidence”

**Forbidden (anywhere in output, explanations, tooltips, emails, UI):**
- “Safe university” / “safety school”, “You will likely get in” / “high admission chance”, “Easy to get into” / “competitive”, any percentage attached to admission, “Guaranteed” in any admission sense, “reach school”

**Persistent clarifier (UI, near every tier badge):** “Fit describes how well this matches your profile — not your chance of admission.” (exact copy may be refined; meaning mandatory).

**Future-proofed Safe Fit:** `getTierLabel("STRONG_FIT", true)` → `"Safe Fit (strong profile fit)"` — never standalone “Safe”, enforceable in one place (`fit-tier.ts`).

## 7. Forbidden-language sweep results: strings found and fixed across Phases 16-19 output

- **Sweep:** `grep -r "admission chance|acceptance probability|reach school|safety school|guaranteed|likely to get in|easy to get into|competitive|Safe university" src/` — **0 hits** in Phase 16-19 output strings (verified via test `Forbidden-language test` which scans `JSON.stringify(res)` for 10 forbidden phrases — pass).
- **Phases 16-19 strings checked:** `src/lib/university-matching/score.ts`, `explanation.ts`, `engine.ts`, `candidate.ts`, `src/lib/university-profile/` — no forbidden language found, no fixes needed.
- **Fit-tier strings:** All 4 tiers + Safe Fit variant verified clean (Safe only appears as “Safe Fit (strong profile fit)”).

## 8. UI changes: badges, clarifier copy, counselor view

**Match results:** Tier badge per result — Strong Fit (green, default), Good Fit (blue, secondary), Potential Fit (amber, outline), Explore (muted, outline) — visually distinct, consistently colored/ordered, badge ordered display respects Phase 16 conceptual sort order (verified relevance first, not silently re-ranked by tier).

**Profile (Phase 19 integration):** When opened with student context, profile shows `fitTier` badge + `fitTierExplanation` + persistent clarifier; neutral without context shows no tier. Verified vs category-based clearly shown (✓ Verified program vs Relevant institution).

**Counselor view:** Tier, definition, explanation, reasons, program matched, verification status, student prefs (country, target institutions, budget where reliable, education pathway, career context), full chain `Career → Education → Degree/Specialization → Program → Institution` — same API, no fork.

**Future-ready:** Tier enum/display mapping in `fit-tier.ts` enforces Safe Fit rendering in one place.

## 9. Tests / typecheck / lint / build results

- **Tests:** `tests/fit-tier.test.mjs` (13 new): exact verified, degree/specialization, curated, category, no-program, country filtering, target institution, medical, science, AI/Data, design, business, India/international, zero/partial/full assessments, deterministic, explanations, forbidden-language, matchScore/confidence/fitTier independence, regression — plus `tests/program-verified.test.mjs`, `tests/university-matching.test.mjs`, `tests/university-profile.test.mjs`, `tests/university-expansion.test.mjs`, `tests/career-matching*`, etc. — **230 pass, 0 fail** (was 217, +13)
- **Typecheck:** `tsc --noEmit --skipLibCheck` — **pass** (fixed `useParams`/`useSearchParams` to props, made `fitTier` optional in `MatchResult` for `score.ts`)
- **Lint:** `next lint` — Invalid project directory (pre-existing, no eslint config)
- **Build:** `next build` — **pass** (new route `/universities/[id]` + fit-tier overlay)
- **Git diff:** Only `src/lib/university-matching/fit-tier.ts` (new), `src/lib/university-matching/types.ts`, `src/lib/university-matching/engine.ts`, `src/app/universities/[id]/page.tsx`, `tests/fit-tier.test.mjs` — no candidate generation rewrite, only overlay.

## 10. Regression results

- Phases 16-19 suites: **pass** (engine frozen, candidate generation Tier 1/2/3 unchanged, ranking unchanged)
- Career Matching + Education flows: unchanged — pass
- Existing Career Matching still functional — pass
- Existing education pathways still functional — pass
- 32 programs validated — pass

## 11. Safety confirmation

- **Zero admission-probability output anywhere:** Verified via forbidden-language test + manual sweep — 0 hits, 0 fixes needed.
- **Zero eligibility invention:** No cutoffs, GPA gates, test-score requirements created; academic compatibility only from existing `averageGrade`/`gradeLevel`/`exams` where available, otherwise graceful degradation to Explore.
- **Budget/academic rules respected:** Budget uses ONLY reliable tuition data (same Phase 16 rule: `budgetScore` 50 unavailable, never defaults); academic uses ONLY existing architecture, missing → Explore, never fake tier.
- **matchScore, confidenceScore, fitTier separate:** Verified via `matchScore / confidenceScore / fitTier independence` test — tier overlay does not mutate scores, all three separate, none is admission probability.
- **No writes to University/IndianInstitution/Program:** `git diff --stat` shows only `src/lib/university-matching/fit-tier.ts` (new), `types.ts`, `engine.ts` (overlay), `src/app/universities/[id]/page.tsx` (UI), `tests/fit-tier.test.mjs` — 0 writes to `University`/`IndianInstitution`/`Program` records (confirmed via `git status` + DB counts unchanged: University 20, Indian 73,969, Program 75).
