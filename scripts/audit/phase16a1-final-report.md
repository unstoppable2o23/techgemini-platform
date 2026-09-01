# Phase 16A.1 — Career Matching Engine Hardening: Final Report

## Status
COMPLETE — A targeted bug-fix/hardening pass over the shipped Phase 16A engine (no rewrite). Four behavioral defects were corrected (truthful match tiers, content-based education stage detection, school-education score neutrality, conservative legacy preferred-career fallback) plus a verified-gap precision tightening. All 311 tests pass (287 baseline + 24 net new/updated), typecheck clean, production build succeeds. No schema change, no migration, no seed/import. `University`/`IndianInstitution` and all university-matching modules are untouched (read-only). The pre-existing Phase 22 audit scripts remain untracked and were excluded from this phase's commits.

## A. Problem
Phase 16A shipped with four correctness issues and one precision gap, all hidden by the passing baseline:
1. **Untruthful match tier.** Alias-map terms ("Analytical Rigour") and embedded canonical phrases ("Logical Mathematical Intelligence") resolved to **CANONICAL 1.0** even though only one side was literal canonical vocabulary. Because the match came from a *maintained mapping*, it must be a weaker **ALIAS 0.9** tier.
2. **Misclassified education stage.** The old `determineEducationStage` was prefix-based, so `study_level:Class 8` (a *school* value) was classified POST_SCHOOL. Prefix semantics cannot distinguish a school student from a college student.
3. **School-education score inflation.** A generic **70** baseline inflated every SCHOOL-stage student's total (a "plausibility" strength with a `/future step/` reason), so a Class 8/10 student with no matching education evidence still gained score — and education was double-counted into the total alongside SUBJECT.
4. **Legacy preferred-career half-boost.** The legacy fallback boosted on *category containment* and *name/title containment*, so a preferred "AI" half-boosted every "AI & Technology"-category career.
5. **Verified-gap precision.** The reliability rule judged **raw signals** (pre-dedup), so a single concept reported through several weak aliases could self-conflict and be mislabeled strong conflict evidence — and the gap branch could fire on a dimension that *also* had real alignment if the raw-signal check didn't align conceptually with the score-side enforcement.

## B. Constraints honored
- No engine rewrite: single `scoreCareer`/`rankMatches` path preserved.
- `University`, `IndianInstitution`, university-matching modules: **read-only** (work confined to `src/lib/career-matching/{semantic-match,score,config}.ts` and test files).
- No schema change → no migration required; no `db push`, no seed/import on build.
- Scoring remains pure, cached, deterministic, free of LLM/network.
- Behavior changes intentionally reshaped the affected test assertions to assert the *new correct* behavior (Phase 16A's own T2/T3/T25/T31 and DB3).
- Confidence caps, dimension/source weights, `PREFERRED_CAREER_BOOST`, and match-strength thresholds unchanged.

## C. Truthful match tiers (`semantic-match.ts`)
- Added `resolveConcept(value)` returning `{ key, kind }` where kind ∈ `direct | alias | embedded`. `canonicalKey` is preserved as a thin wrapper returning the key.
- `matchSignalAgainstTrait` now sets **CANONICAL 1.0** only when **both** sides resolve `direct`. If either side reached the concept via the alias map (`alias`) or an embedded canonical phrase (`embedded`), the match is **ALIAS 0.9** — truthful tier labelling, never silently upgraded.
- `STRUCTURED` / `LEXICAL` tiers untouched.
- Tests: **H1/H2**, and updated **T2/T3** (`Logical Mathematical Intelligence`, `Analytical Rigour`) now assert ALIAS 0.9; new **T3b** confirms a direct-on-both-sides term stays CANONICAL.

## D. Content-based education stage detection (`score.ts`)
- Replaced `determineEducationStage` (prefix-based) with exported `detectEducationStage`, evaluated on the **stripped, normalized content**:
  - `POST_SCHOOL_RE` markers: undergraduate/postgraduate/post-secondary, bachelor/B.Tech/B.E./B.Sc(B)/B.Com/B.Sc/BCA, master/M.Tech/M.Sc/MBA/PGDM, MBBS/MD/MS, LLB, PhD/doctoral, graduate, diploma/certificate, degree, university, college, plus degree abbreviations.
  - `SCHOOL_CLASS_RE` (`class|grade|std|standard|year N`) and `SCHOOL_PHRASE_RE` (high/secondary/middle/primary/elementary school).
  - POST wins over SCHOOL when both appear (a completed "Grade 12 / High School" alongside a current "Year 1 Undergraduate" ⇒ POST).
- **Planned/future markers are ignored entirely** (`planning|aspiring|hoping|intend|want|going to|will …|pursu*`), so "planning to take a B.Tech" ⇒ UNKNOWN, never POST_SCHOOL (test **H5**).
- Prefix fallback only for content that is otherwise unclassifiable: `grade_level:` ⇒ SCHOOL; `study_level:`/`highest_education:` ⇒ POST_SCHOOL (a stated *current* level, not intent) — this is what correctly powers `study_level:MBBS NEET UG` ⇒ POST (the `Surgeon` pathway, **DB6**).
- Tests **H3/H4/H5/H6**.

## E. School-education score neutrality (`score.ts` + `config.ts`)
- Removed `EDUCATION_SCORING.schoolBaseline` (70) entirely from `config.ts`.
- SCHOOL stage now returns `score: 0`, `includeInScore: false`, **no reasons**, **no evidence** — neutral and non-ranking. Future plausibility is carried by other dimensions (notably SUBJECT), never double-counted from education.
- Verified in unit **T25** (school score equals the no-education-evidence score for the same profile; no education reasons; no penalty) and engine **DB10** (a Class 8 + Biology student's Medicine score is byte-identical with vs without a declared school stage, `edu.score === 0`, no education reason, no education development-area). **DB3** updated: `edu.score === 70` → `0` with no education reasons.
- Class 8 + Biology stays plausible purely through the SUBJECT dimension (tests **T25**, **DB3**, **DB10**, medical-comprehensive CLASS_8–12).

## F. Conservative legacy preferred-career fallback (`score.ts`)
- Removed name/title **containment** and **category containment** (the "AI" half-boost).
- Legacy fallback (`PREFERRED_CAREER_ALIASES` empty, unresolved free-text) now boosts **only** on exact normalized name or exact normalized title equality.
- Canonical id resolution remains authoritative: an id resolving to a different career never falls back to text (test **H20**); an invalid id never guesses.
- Tests **H18** (preferred "AI" boosts neither "AI & Technology"-category careers nor substring careers), **H19** (exact name), **H21** (exact title), **H20** (id-authoritative never falls back).

## G. Verified-gap precision (`score.ts`)
- Reliability is now judged on the **deduplicated per-concept representation** in `uniqueStudentValues` (each value carries `score`), so one concept reported via several weak aliases cannot self-conflict into a strong claim.
- The gap itself remains gated on `matchedCount === 0` (in `explain.ts`, unchanged): a dimension with **any** real alignment shows that alignment and never a gap for the missing trait.
- Tests **H9** (mixed aligned+non-aligned SUBJECT: Mathematics matches, Programming runs free ⇒ alignment, no false gap), **H10** (reliable 95 ASSESSMENT skill vs career that really has none ⇒ VERIFIED_GAP + development area), **H11** (weak 40 self-reported non-aligned ⇒ DEVELOPMENT_AREA only, never VERIFIED_GAP), and **DB9** (engine-level mixed SKILL evidence ⇒ no false gap).

## H. Evidence separation & determinism (regression health)
- Subject evidence remains gated to **SUBJECT** and never leaks into SKILL/APTITUDE (DB7 unchanged, passing).
- Confidence guards, single-signal breadth control, and cap-on-preferred-only retained (DB4, T12/T18/T21/T22).
- Deterministic ranking and idempotent engine calls retained (DB8, T33/T34).

## I. Corrected-vs-prior behavior summary
| Behavior | Before 16A.1 | After 16A.1 |
| --- | --- | --- |
| Alias-map / embedded term | CANONICAL 1.0 | **ALIAS 0.9** |
| `study_level:Class 8` stage | POST_SCHOOL (wrong) | **SCHOOL** |
| School student education score | 70 baseline + strength | **0, excluded, no reason** |
| Preferred "AI" on AI-category | half-boost | **no boost** |
| Repeated alias self-conflict | possible false VERIFIED_GAP | **deduped, no false gap** |
| Mixed aligned+non-aligned | could report gap for missing trait | **always alignment-first** |

## J. Verification
| Gate | Result |
| --- | --- |
| `npm test` | **311 pass / 0 fail** (baseline 287; +21 unit in `career-matching-harden`, +T3b, +DB9/DB10, updated T2/T3/T25/T31, DB3) |
| `npx tsc --noEmit --skipLibCheck` | clean |
| `npm run build` | succeeds (all routes registered; `NODE_OPTIONS=--max-old-space-size=4096`) |
| `npm run lint` | still broken pre-existing (Next 16 `next lint` invalid-dir; no ESLint config) — unchanged, recorded only |
| Schema / migrations | **none** — no `prisma db push`, no `--accept-data-loss`, no new migration |
| `University` / `IndianInstitution` | untouched (read-only) |
| Phase 22 scripts | remain untracked, excluded from commits |

### Stage-detection classification matrix (unit tests)
- `study_level:Class 8/9/10/11/12` ⇒ SCHOOL; `grade_level:CLASS_10` ⇒ SCHOOL; `highest_education:Grade 12 / High School` ⇒ SCHOOL (**H3**).
- `study_level:Year 1 Undergraduate` / `study_level:B.Tech …` / `highest_education:Master's Degree` / `study_level:MBBS NEET UG` ⇒ POST_SCHOOL (**H4**).
- `study_level:planning to take B.Tech` / `study_level:hoping to pursue a Master's` ⇒ UNKNOWN (**H5**).
- both stages ⇒ POST_SCHOOL; no evidence ⇒ UNKNOWN (**H6**).

### Files & commits
- Modified: `src/lib/career-matching/{semantic-match,score,config}.ts`; `tests/career-matching-semantic.test.mjs`; `tests/career-matching-16a-regression.test.mjs`.
- New: `tests/career-matching-harden.test.mjs` (H1–H21) and this report.
- Excluded (pre-existing, Phase 22): `scripts/audit-phase22-*.mjs`, `scripts/probe-golden-data.mjs`, `scripts/trace-golden-paths.mjs`.