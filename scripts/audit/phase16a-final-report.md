# Phase 16A — Career Matching Quality & Explainability v2: Final Report

## Status
COMPLETE — Engine was improved WITHOUT a rewrite. No assessment banks, no institution/university records, and no university-matching modules were touched. No destructive migrations. The scoring loop remains deterministic and free of external/LLM calls. All existing career-matching tests pass unchanged, and the pre-existing Phase 22 work was set aside (its audit scripts remain untracked and were excluded from this phase's commits).

## A. Problem
Static bank‑based matching over‑rewarded surface vocabulary, double‑counted repeated signals, saturated scores to 100 (a real bug — see **L12**), reported "development areas" for missing (not conflicting) data, and could not explain *why* a career scored the way it did. Career recommendations also scattered across modules (counselor dashboard, student 360, career library) reading the same renamed fields.

## B. Constraints honored
- No engine rewrite: `scoreCareer`/`rankMatches`/signal pipeline retained as the single scoring path (`getCareerMatches` → `generateStudentCareerProfile` → scores).
- Assessment banks, university/institution records, university-matching modules: **read-only** (work was confined to `src/lib/career-matching/*`, `student/profile.ts`, the student career-match API routes, and `prisma/schema.prisma`).
- Schema changed only additively (`preferredCareerId` + relation); applied via `prisma db push --skip-generate` (the repo's deploy flow is `db push`; no migration file was created).
- No LLM/network in scoring; matching is pure, cached, deterministic.
- Missing info ≠ weakness (`MISSING_EVIDENCE`), conflicting evidence ≠ verdict (`DEVELOPMENT_AREA` / `VERIFIED_GAP` with a documented reliability threshold).
- Preferred career is a *preference*, not proof of fit: it can never generate high confidence (capped, test **E2/E4**).
- Score is "Career Compatibility Score", never a probability.
- Match trace is internal: stripped from student-facing responses via `sanitizeCareerMatch`; counselor API keeps it.

## C. Semantic matching hierarchy (`semantic-match.ts`)
`matchSignal` resolves both sides by: canonical signal key (assessment vocabulary) → canonical embedded-key hint → explicit alias map → STRUCTURED concept groups → bounded lexical tiers.
- CANONICAL 1.0 · STRUCTURED 0.85 · LEXICAL exact 0.7 / contains 0.55 / word‑sim ≥0.66 (non‑subset) 0.5 — never above the concept tiers.
- False‑similarity guard: "AI Engineer" vs "AI Ethics Researcher" ⇒ NONE; "Data Analysis" vs "Analytical Thinking" ⇒ NONE; "Statistics" vs "Statistical Methods" ⇒ NONE (test **C7/C8**).
- Economic alias normalization: "Analytical" vs "Analytical Rigour" resolves via the alias map onto the canonical concept (CANONICAL, not a soft tier) — test **C3** documents this behavior.
- `CONCEPT_GROUPS` kept deliberately small (programming, mathematics) so near‑homographs are never conflated.

## D. Preferred-career canonicalization (`preferred-career.ts` + `student/profile.ts`)
- Schema: `StudentProfile.preferredCareerId String?` + `preferredCareerRef Career? @relation("PreferredCareer")`; `Career.preferredByStudentProfiles[]`.
- `saveCareerPreferences` now persists the canonical `preferredCareerId` (from `careerId` or legacy name lookup) and nulls it when the student has not finalized a career.
- Engine resolves in order: canonical id → exact normalized name → explicit alias (`PREFERRED_CAREER_ALIASES`, intentionally empty for now) → recorded `unresolved`.
- Canonical resolution **disables** name/category guessing for every other career: the boost goes only to the canonical career (tests **D1/D3**, **T14**). Legacy string fallback still boosts via name/title/category for back‑compat (test **T15**, **D2**). An invalid id input never falls back to text guessing (test **T12**).
- `PREFERRED_CAREER_BOOST` unchanged (12); half boost for category‑only legacy hits.

## E. Confidence (`confidence.ts`)
Evidence‑driven, separate from match score, not probability. Inputs: distinct matched signals, distinct matched dimensions, source diversity, assessment evidence that truly matched, coverage of the career's trait dimensions. Deliberate caps:
- One preferred‑career signal ⇒ `≤ 0.30` (LOW) even if it textually matches a career trait (tests **E2/E4**, **DB4**).
- Any single‑signal match ⇒ LOW/MODERATE, never HIGH (test **E3**).
- Cases A–D verified: diverse assessment + profile ⇒ HIGH; repeated signals in one dimension stay LOW/MODERATE (tests **E1/E3/E5**).
- Zero matched signals with existing signals ⇒ capped LOW; level thresholds HIGH ≥0.7, MODERATE ≥0.4.

## F. Single-signal domination control (`score.ts`)
- Per‑student‑value credit cap: a value that matches multiple traits credits full strength on its first claim and `0.5×` on subsequent ones.
- Breadth factor: `min(1, 0.6 + 0.1 × supportedDimensions)`.
- Verified by test **T22**: a single perfect INTEREST signal (100) scores far below a well‑rounded four‑dimension profile; and **E4 (T21)** shows `matchScore` still respects the cap so a lone "preferred" fact cannot both boost and dominate.

## G. Evidence separation
- Signals stay dimension‑bounded (`uniqueStudentValues` groups by dimension before scoring). Subjects produce `SUBJECT` (+ `INTEREST subject_*`) evidence and never leak into `SKILL`/`APTITUDE` (unit **T23**, engine **DB7**).
- Career‑field mapping is explicit and isolated: SKILL = technical (0.8) + soft (0.6) skills; INTEREST/PERSONALITY/SUBJECT from their own fields; degrees from `recommendedDegrees` + `CareerEducationPathway.degree.name`.
- Subject/interests/streams keep their prefixes (`STREAM_SUBJECTS`/`STREAM_INTEREST`); `stripSignalPrefix` normalizes before compare so concepts, not strings, are matched (test **T8**).

## H. Stage-aware education scoring (`scoreEducation`)
- Stage derived from education signals: `grade_level:` ⇒ SCHOOL; `study_level:`/`highest_education:` ⇒ POST_SCHOOL; else UNKNOWN.
- SCHOOL: plausible 70 baseline + "future step" strength reason; never a penalty (tests **T25**, **DB3** — Class 8 with Biology is scored on future plausibility).
- POST_SCHOOL aligned: 85; divergent: neutral 55 with `DEVELOPMENT_AREA` reason, never `VERIFIED_GAP` (tests **T26/T27**) — students switch tracks.
- UNKNOWN: 0 + `MISSING_EVIDENCE`; the education component only enters the total when the student also has non‑education evidence.
- Degrees matched from `recommendedDegrees` (0.5) and real `CareerEducationPathway` degree records (0.6) — verified end‑to‑end in **DB6** (aligned pathway degree ⇒ education 85).

## I. Evidence-type separation in explanations (`explain.ts`)
`MatchReason` now carries `evidenceType`:
- `MISSING_EVIDENCE` — no student data for the dimension (no penalty).
- `DEVELOPMENT_AREA` — evidence present but not aligned (a gap we can grow into).
- `VERIFIED_GAP` — reliable conflicting evidence (assessment ≥60 or any source ≥85) + a development‑area surfacing (tests **T30**, **DB5**).
- `preference_boost` reason when the preferred boost fires; education reasons are appended once by the caller (no double counting).
All strengths ≥60, moderates 30–59, "early" <30, plus `missingEvidence` / `developmentAreas` / `verifiedGaps` / `strengths` arrays preserved for existing consumers.

## J. API surface & determinism
- Student `career-matches` and `career-matches/[careerId]` sanitize the internal trace (`sanitizeCareerMatch`); counselor route intentionally keeps it. All consumer fields (`matchScore`, `matchStrength`, `sourceSummary`, `studentSignalsUsed`, `dimensionScores`, `reasons`, `developmentAreas`, `missingEvidence`) unchanged.
- `CareerMatch` is stronger‑typed: `evidence`, `matchTypes`, `verifiedGaps`, `confidenceDetail`, `supportedDimensions`, `trace`.
- Deterministic ranking: `matchScore desc → confidenceScore desc → supportedDimensions desc → name asc → id asc` (tests **T33**, **T34**, **DB8** idempotent engine calls).

## K. Skills/tests
- New unit suite `tests/career-matching-semantic.test.mjs` (34 scenarios) — semantic tiers, false‑similarity guards, canonical preferred resolution, confidence A–D, single‑signal cap, evidence separation, stage‑aware education, evidence‑type metadata, sanitize, determinism.
- New DB suite `tests/career-matching-16a-regression.test.mjs` (8 scenarios) — canonical `preferredCareerId` persistence + no boost‑leak, legacy name resolution, Class 8 no‑penalty, lone‑preference low confidence, VERIFIED_GAP surfacing, pathway degrees ⇒ education 85, SUBJECT‑only gating, engine idempotency.

## L. Verification
| Gate | Result |
| --- | --- |
| `npm test` | **287 pass / 0 fail** (was 245; +34 unit, +8 DB) |
| `npx tsc --noEmit --skipLibCheck` | clean |
| `npm run build` | succeeds (all routes registered) |
| `prisma db push --skip-generate` | applied without data loss |
| Existing tests | all 245 pre‑existing pass unchanged |

### L12 — fixed latent bug found while testing
`score.ts` produced `raw = (weightedSum / weightSum) * 100` — but each dimension score is *already* a 0–100 percentage, so the mean was silently ×100 and clamped to 100 (`Math.min(100, …)` masked it). Any career whose honest score exceeded ~50 sat at a misleading 100. Fixed to `raw = weightedSum / weightSum`; the breadth factor now genuinely discriminates (a single strong dimension: ~49, not 100) — see test **T22**.

## M. Files & commits
Committed as `Phase 16A: career matching quality & explainability v2`:
- `src/lib/career-matching/{types,config,score,engine}.ts` (rewritten), `{semantic-match,preferred-career,confidence,explain}.ts` (new)
- `src/lib/student/profile.ts`, `src/app/api/student/career-matches/route.ts`, `src/app/api/student/career-matches/[careerId]/route.ts`, `prisma/schema.prisma`
- `tests/career-matching-semantic.test.mjs`, `tests/career-matching-16a-regression.test.mjs`

Left out (pre‑existing, Phase 22): `scripts/audit-phase22-*.mjs`, `scripts/probe-golden-data.mjs`, `scripts/trace-golden-paths.mjs`. `npm run lint` remains broken pre‑existing (Next 16 `next lint` invalid‑dir / no ESLint config).