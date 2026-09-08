# Phase 25 — Career Recommendation Quality, Explainability & Actionability V2

**Status:** COMPLETE — student-facing career matches are now explainable and actionable without touching the frozen Career Matching Engine. The fix-score, confidence, low-information, preferred-career, comparison, education-path, and counselor-view layers are all presentation/data plumbing layered on the existing `MatchResult`. Engine files are byte-identical to the Phase 18-1 freeze baseline. Dataset counts unchanged. All 661 tests pass.

## 1. Scope and guardrails (Parts 16/20/21)

- **Engine FROZEN**: no changes to `src/lib/career-matching/*` (weights, scoring, ranking, confidence, explanations, assessment scoring/questions).
- **DB protected**: `University` (20), `IndianInstitution` (73,969), `career` (289), `subject` (59) untouched. Only additive schema change (`ProductEvent`) applied via plain `prisma db push` (no `--accept-data-loss`, no migration, no truncation/reseed).
- **Verification**: freeze harness output re-generated and compared to `scripts/audit/phase18-1-engine-freeze-baseline.json` → `IDENTICAL_TO_FREEZE_BASELINE=YES` (ignoring `generatedAt`/`metadata`). The in-suite `engine-freeze-immutability` + `matching results byte-identical` regressions also pass.

## 2. Explainability model (new pure lib)

`src/lib/recommendations/explainability.ts` — presentation-only, no recomputation:

- **Part 3 — score/match wording**: `Match Score: N` label + helper *"Based on the evidence currently available in your profile."*; strength tiers → `Strong match` / `Good match` / `Developing match` / `Limited evidence` (no probability, no surprise verdicts).
- **Part 4 — confidence**: `High/Moderate/Low confidence` headings and fixed, non-statistical explanation strings.
- **Part 8 — why this matches**: preference first, then strength reasons, then strengths; deduped, bounded, and returns nothing when there is no evidence (never invents reasons).
- **Part 10 — development areas**: engine strings are re-phrased into "an area to develop that could strengthen this pathway"; no item may read as a verdict ("you are weak at…", "not aligned" alone).
- **Part 9 — action plan**: `nextActions()` derived ONLY from actual missing dimensions (EDUCATION→/career-preferences, SUBJECT→subjects, APTITUDE→intelligences, PERSONALITY→personality, INTEREST, WORK_ENVIRONMENT→/career-profile); exploration step always survives even when many gaps exist; capped at 4.

## 3. Student recommendation experience

`src/app/(student)/career-matches/career-matches-client.tsx` rewritten to compose new components (`src/components/recommendations/recommendation-card.tsx`, `low-information-state.tsx`, `compare-drawer.tsx`):

- **Part 5 — low-information state**: when the engine reports `lowInformation`, show an honest "early directional suggestions" state with per-dimension missing-info chips and CTAs **Complete your profile** (/career-preferences) and **Take recommended assessment** (/assessments) — instead of dressing an arbitrary ordering up as recommendations.
- **Part 6 — preferred-career distinction**: cards clearly mark **"Your selected preference"** vs **"Recommended from your profile"**.
- **Part 7 — cards**: rank, title, category/demand, Match Score + helper text, strength badge, top evidence reasons, confidence explainer, missing/development indicators, education pathway, action-plan badges, compare checkbox, View Career.
- **Part 8 — expandable detail**: "Why this matches" shows strengths, dimension-supported signals, areas to develop, missing evidence, education path, and recommended next steps; fires `career_detail_opened` analytics.
- **Part 11 — comparison (max 3)**: checkbox selection capped at 3; sticky compare bar; `CompareDrawer` renders a side-by-side table (education path, programs, career options, skills, work environment, activities, why-it-fits) from the new `/api/student/career-matches/compare` route; client caps selection at 3 and the route rejects >3 with 400.
- **Part 17 — accessibility**: text labels on all badges/ranks (never color-only), `aria-label` on rank/compare inputs, `aria-expanded` on expandable sections, icons + text throughout.

## 4. Student API additions (presentation only)

- `/api/student/career-matches` and `/[careerId]` now return the engine's `lowInformation` and `topMatchStrength`, plus a per-match `educationPath` (`{primary, alternative}`) built from the stored `CareerEducationPathway` data (one query, no N+1). Students still get `sanitizeCareerMatch` (trace stripped); all explainability fields retained.
- New `/api/student/career-matches/compare` — validates 1–3 ids, composes the engine's own ranking with career work-environment/skills/options/education-path and `getCareerPrograms` output.

## 5. Counselor 360 detail view (Part 12)

`src/app/(counselor)/students/[id]/student-360-client.tsx` CareerTab now exposes a **Detailed evidence** section: dimension-score table, confidence factors (matched signals, dimensions, source diversity, assessment-derived, coverage, capped flag), reason breakdown, matched-evidence rows (dimension → student value → career trait, source/match type), trace highlights, and missing/verified gaps — alongside the existing counselor feedback form. Data path verified: `getStudent360` returns the full match (trace included) for counselors.

## 6. Medical & diploma safety (Parts 14/15)

Verified against live DB and pinned by tests:

- **M1**: Medicine → PRIMARY degree `MBBS`; Dentistry → PRIMARY `BDS`; distinct stored degrees per healthcare career — no fabricated single "MBBS" applied across healthcare.
- **M2**: every rendered degree label is a real, non-empty stored name (no placeholder fallback).
- **M3**: Diploma pathways keep self-describing labels and are never collapsed to an engineering degree (`B.E./B.Tech`).

Diploma vs Bachelor tracks remain distinct in the existing counselor EducationTab (post–Class 10 pathway note retained).

## 7. Career → program connections (Part 13)

Matched careers link to real academic programs via the existing `getCareerPrograms`/`CareerProgramMapping` plumbing (used by the compare drawer and card education-path), verified by `PR1`.

## 8. Privacy-safe analytics (Part 18)

- New additive Prisma model `ProductEvent` (tenantId, userId, event, optional careerId/slug/name, small `meta` Json, createdAt; indexed).
- `src/lib/analytics/record.ts` — server-side recorder (auto-attaches tenant from the user; never accepts raw assessment answers).
- `src/lib/analytics/client.ts` — fire-and-forget client helper (`trackRecommendationEvent`) that never blocks UI.
- `POST /api/student/analytics/events` — auth-gated (STUDENT only, 401/403), event allowlist (recommendation_viewed, career_detail_opened, compare_opened, program_explored, university_explored, profile_completion_cta_clicked, assessment_cta_clicked), meta coerced to scalars, malformed payloads → 400.
- Wired events: recommendation_viewed (page load), career_detail_opened (expand + View Career), compare_opened, profile_completion_cta_clicked, assessment_cta_clicked. `program_explored`/`university_explored` remain available for the library CTAs.

## 9. Tests

New `tests/phase25-career-recommendations-v2.test.mjs` (25 tests):

- **P1–P6 (explainability, pure)**: strength labels (no probability wording), confidence headings/explanations, why-this-matches ordering/dedup/bounding/no-invention, missing-evidence catalog mapping, development-area growth phrasing, next-actions source/links, explore-step survival.
- **G1–G4 (golden regression)**: hardcoded engine numbers for a fixed synthetic candidate (64 / 76 with +12 preferred boost / 0 with no signals, confidence 41/11); preferred boost exactly `PREFERRED_CAREER_BOOST`; non-preferred careers unboosted.
- **A1–A4 (DB-backed)**: low-information state for a near-empty profile; meaningful sorted matches for a seeded profile; student API shape (trace stripped, evidence/dimensionScores/confidenceDetail/reasons retained); determinism (two runs identical top-5).
- **C1**: counselor 360 keeps the full trace.
- **M1–M3**, **PR1**: medical distinctness, label safety, diploma label safety, career→program mapping.
- **AN1–AN2**: ProductEvent persistence with and without meta.

Suite-wide: **661 tests pass / 0 fail** (baseline 636 + 25 new). Typecheck clean. Production `next build` succeeds. Lint: the repo's `next lint` script is broken under Next 16 (`next lint` removed; no ESLint config present), so lint guidance is documented rather than executed — typecheck + build + tests are the enforced gates.

## 10. Changed files (Phase 25)

- `src/lib/recommendations/explainability.ts` (new)
- `src/lib/analytics/record.ts`, `src/lib/analytics/client.ts` (new)
- `src/app/api/student/analytics/events/route.ts` (new)
- `src/app/api/student/career-matches/compare/route.ts` (new)
- `src/app/api/student/career-matches/route.ts`, `[careerId]/route.ts` (lowInformation/topMatchStrength/educationPath enrichment)
- `src/components/recommendations/recommendation-card.tsx`, `low-information-state.tsx`, `compare-drawer.tsx` (new)
- `src/app/(student)/career-matches/career-matches-client.tsx` (rewritten)
- `src/app/(counselor)/students/[id]/student-360-client.tsx` (CareerTab detailed evidence)
- `prisma/schema.prisma` (additive `ProductEvent` + `User.productEvents`, generated + db push)
- `tests/phase25-career-recommendations-v2.test.mjs` (new)
- `scripts/audit/phase25-career-recommendations-v2-audit.md` (this report)

**Engine files unchanged** (verified by freeze guard). **No** changes to `University`/`IndianInstitution`/`career`/`subject` data.