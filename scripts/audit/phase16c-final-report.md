# Phase 16C — Career Intelligence Enrichment V1

**Status**: COMPLETE
**Build**: 312 existing tests + 19 new Phase 16C tests, all pass (331 total)
**Typecheck**: clean (`npx tsc --noEmit --skipLibCheck`, exit 0)
**Build**: compiled successfully (exit 0)
**Harness**: `scripts/audit/phase16b-golden-harness.mjs` reused for BEFORE/AFTER
**Machine output**: `scripts/audit/phase16c-golden-before.json`, `scripts/audit/phase16c-golden-after.json`, `scripts/audit/phase16c-golden-compare.mjs`, `scripts/audit/phase16c-career-data-baseline.{json,md}`

> **Scope / honesty note.** This phase enriches the **career data layer only**.
> It adds canonical **APTITUDE** and **WORK_ENVIRONMENT** CareerTrait rows plus
> INTEREST/PERSONALITY enrichment for thin careers, and conservative preferred
> aliases. The matching **engine is unchanged** (the one source edit in Phase
> 16C is the alias map in `preferred-career.ts`, a data declaration, not
> scoring logic). No assessment scoring changed, no University /
> IndianInstitution / Program row was read or written, no destructive migration
> was run, and no trait was invented purely to improve a golden test. Every
> APTITUDE / WORK_ENVIRONMENT value is drawn from the **existing** canonical
> assessment vocabulary so a student assessment output can actually match it.

---

## A. What was added

| Change | Detail |
|---|---|
| **APTITUDE traits** | 138 rows across 76 careers; values = Multiple Intelligences + Ideal Career canonical signals (`logical_reasoning`, `logical_mathematical`, `pattern_recognition`, `attention_to_detail`, `visual_spatial`, `interpersonal`, `intrapersonal`, `naturalist`, `emotional_intelligence`, `linguistic`, `bodily_kinesthetic`, `self_awareness`). Baseline was **0 APTITUDE rows**. |
| **WORK_ENVIRONMENT traits** | 92 rows across 76 careers; values = Learning & Productivity canonical signals (`prefers_quiet`, `prefers_structure`, `prefers_autonomy`, `independent_preference`, `collaborative_preference`, `self_driven`, `formal_setting`). Baseline was **0 WORK_ENVIRONMENT rows**. |
| **Thin-career enrichment** | 72 INTEREST/PERSONALITY rows + curated `interests`/`personalityTraits` arrays for 12 thin careers (Forensic Accounting, Cyber Law, Gemology, Veterinary Science, Visual Merchandising, Advertising, Wildlife Biology, Library Sciences, Forensic Science, Game Development, Information Technology Business Analysis, Agricultural Engineering). |
| **Zero-trait careers** | Forensic Accounting, Cyber Law, and Gemology had **zero CareerTrait rows**; the applier derives their SUBJECT/SKILL/EDUCATION rows from their existing arrays (39 rows). |
| **Preferred aliases** | 8 conservative professional-title aliases; deliverables below. |

`careersScored` remains **251** active careers.

---

## B. Why the canonical vocabulary (honest resolution)

The Phase 16C brief asked for occupational environments. Occupation vocabulary
such as `office_based`, `people_facing`, or `field_based` is **not** emitted by
any assessment, so it could never match a student signal — such traits would be
dead rows. The design therefore maps occupational environment compatibility onto
the **Learning & Productivity** canonical environment signals a student can
actually produce (`prefers_quiet`, `prefers_structure`, `prefers_autonomy`, …),
and aptitudes onto the **Multiple Intelligences / Ideal Career** signals. This is
the honest, non-fabricated mapping allowed by the STOP conditions. It is
compatibility evidence, not a claim of occupational-predictive validity.

---

## C. Canonical whitelist gate

Every APTITUDE and WORK_ENVIRONMENT value in `scripts/phase16c-data.ts` is
validated at test time (C14) against `CANONICAL_SIGNALS` from
`src/lib/career-profile/canonical-signals.ts`:

- each APTITUDE value must be declared with `dimension === "APTITUDE"`;
- each WORK_ENVIRONMENT value must be declared with `dimension === "WORK_ENVIRONMENT"`;
- no duplicate value within a career+dimension (must satisfy `@@unique([careerId, dimension, value])`).

This prevents any non-canonical or cross-dimension leakage (e.g. `situational_judgment`,
which is emitted as INTEREST, is deliberately **not** used as an APTITUDE trait).

---

## D. Enrichment mechanism (idempotent)

`scripts/phase16c-apply.mjs` is deterministic and idempotent:

- upserts each CareerTrait on the unique compound key `careerId + dimension + value`
  (`careerId_dimension_value`), so re-running can never create duplicates;
- derives array fields from the static data module, not from DB state;
- never deletes pre-existing rows; never touches University / IndianInstitution / Program;
- never runs `prisma db push`.

Verified: a second run reproduced identical totals and **0 duplicate rows**
(duplicate guard via `GROUP BY ... HAVING COUNT(*) > 1`).

---

## E. Enrichment counts (BEFORE → AFTER)

| Dimension | BEFORE | AFTER | Added |
|---|---|---|---|
| APTITUDE | 0 | 138 | +138 |
| WORK_ENVIRONMENT | 0 | 92 | +92 |
| INTEREST | 707 | 743 | +36 (thin careers) |
| PERSONALITY | 717 | 753 | +36 (thin careers) |
| SUBJECT | 763 | 772 | +9 (zero-trait careers) |
| SKILL | 1921 | 1945 | +24 (zero-trait careers) |
| EDUCATION | 538 | 544 | +6 (zero-trait careers) |
| **Total rows** | **4646** | **4987** | **+341** |

`isActive` careers still 251; the 3 previously zero-trait careers now have full trait rows.

---

## F. Golden harness BEFORE / AFTER

Same harness (`scripts/audit/phase16b-golden-harness.mjs`), real DB path, 23
golden profiles. The BEFORE snapshot was captured against the **pre-enrichment**
trait state (all 138+92+72 enrichment rows transiently removed, then restored
idempotently — totals verified identical afterwards). Uses natural language: no
"tuning" was applied to force golden percentages.

**Observations**

- **Preferred careers still rank #1** after enrichment and pre-enrichment: `M:Medicine@#1`, `N:Software Engineering@#1`, `P:Law@#1` (unchanged).
- Profile **S (assessment-only)** improved: top10 expected-family coverage **30% → 50%** — direct evidence the new APTITUDE evidence helps an assessment-only student.
- Profiles **A (Science), M (Medicine), V (conflicting)** improved top5 coverage.
- Match-score buckets: `0` band fell 60 → 40; `50-69` band rose 48 → 68 (scores spread out, evidence better distributed).
- A set of profiles (B, F, G, L, N) showed ±10pt **family-coverage percentage** fluctuations at the top-5/top-10 **cutoff**. These are **tie-break shuffles within a large equal-score band**, **not score reductions**: every displaced career (e.g. Artificial Intelligence, Cloud Computing for the CS profile) retained the identical `matchScore` (49) as the careers that replaced them in the ordering.

**Why the tie shuffle happens.** In `score.ts:487` a dimension only enters the
score average when `matchedCount > 0`; a student with **no** APTITUDE /
WORK_ENVIRONMENT assessment signals therefore gets a **0 score** for those
dimensions, which is **excluded** from the weighted average — it is strictly
**neutral**, not penalising. However, `careerTraitDimensions` (score.ts:519)
still counts *all* trait dimensions, so adding APTITUDE/WE trait rows perturbs
`computeConfidence` by a point or two for careers tied on matchScore. The
deterministic tie-break (score → confidence → supported dimensions → name) then
reorders careers that have the **same** score.

**Honest conclusion.** The enrichment does **not** lower any student's top-career
scores. It raises evidence for students who produce APTITUDE/WORK_ENVIRONMENT
assessment signals and stays neutral for those who do not. The golden-percentage
fluctuations are cutoff artifacts of the fixed top-N slice over an equal-score
tie band. Per the STOP conditions ("no overfitting"), **no weight or data was
tuned to restore golden percentages**; the resulting confidence-delta tie order
is accepted and reported.

---

## G. Generic-STEM differentiation (domination reduction)

The 16B root cause (broad careers free-riding generic STEM subjects) is reduced
at the data level. Adding career-defining APTITUDE (+ weight 1) and
WORK_ENVIRONMENT trait rows increases the trait denominator for careers like
Agricultural Engineering (now `naturalist` = 1), so a student who meets the
subjects but has `logical_reasoning`/`naturalist` aptitude evidence differentiates
cleanly. Test **C13** proves a `naturalist`-aptitude student scores higher in
Agricultural Engineering's APTITUDE dimension than in Software Engineering.

---

## H. Preferred-career aliases (conservative)

Added to `PREFERRED_CAREER_ALIASES` in `src/lib/career-matching/preferred-career.ts`
(8 aliases), each verified to resolve to a single, active, defensible discipline:

- `software engineer` → Software Engineering
- `civil engineer` → Civil Engineering
- `data scientist` → Data Science
- `lawyer` → Law
- `physician` → Medicine
- `psychologist` → Psychology
- `pharmacist` → Pharmacology
- `biotechnologist` → Biotechnology Research

Deliberately **excluded** as ambiguous (no single defensible target), verified
against the real catalog: `architect` (Cloud Solutions Architect vs Architecture),
`doctor` (broader than any one discipline), `accountant`, `manager`, and any title
with no matching career (`management consultant`). The golden harness now resolves
`M:Medicine`, `N:Software Engineering`, `P:Law` through these aliases (confirmed
#1). Test cases C11/C12/C12b cover the alias map and the no-guess rule.

---

## I. Tests added (19, file `tests/career-matching-16c.test.mjs`)

| Category | Tests |
|---|---|
| APTITUDE canonical matching | C1, C3, C18 |
| WORK_ENVIRONMENT canonical matching | C2, C3 |
| Assessment-only | C3 |
| Profile (non-assessment) mismatch neutrality | C4 |
| Combined evidence | C5 |
| Medicine ranking | C6 |
| Software/AI ranking | C7 |
| Law ranking | C8 |
| Psychology ranking | C9 |
| Arts/design ranking | C10 |
| Preferred aliases resolve | C11 |
| Ambiguous alias stays unresolved | C12, C12b |
| Generic-STEM differentiation | C13 |
| Canonical whitelist (no non-canonical leakage) | C14 |
| Idempotent / pure-mapping data | C15 |
| No art-substring regression (16B rule) | C16 |
| Deterministic ranking | C17 |

All 19 pass; full suite **331/331**.

---

## J. STOP-condition compliance

- **Engine unchanged**: no change to `score.ts`, `semantic-match.ts`, `config.ts` scoring, `confidence.ts` logic in Phase 16C (only the alias data map in `preferred-career.ts`). ✔
- **No overfitting**: no weight/data tuning to raise golden coverage; the tie-shuffle is reported, not "fixed". ✔
- **No invented traits**: every value is from `CANONICAL_SIGNALS`. ✔
- **No University / IndianInstitution / Program writes**: applier never selects or writes those models (read-only). ✔
- **No destructive migration**: never ran `prisma db push --accept-data-loss`. ✔
- **No assessment scoring changes**. ✔
- **Idempotent, deterministic, duplicate-free**. ✔

---

## K. Verification commands

```
npm test                     # 331/331 pass (19 new Phase 16C tests)
npx tsc --noEmit --skipLibCheck   # exit 0
npm run build                # exit 0 (NODE_OPTIONS=--max-old-space-size=4096)
scripts/audit/phase16b-golden-harness.mjs  # BEFORE/AFTER snapshots, transient rows, teardown, no residue
```

`npm run lint` remains unusable (pre-existing Next 16 `next lint` invalid-dir
issue) and is recorded, not fixed — same as prior phases.

---

## L. Files changed / added

**New**
- `scripts/phase16c-data.ts` (enrichment data module, canonical APTITUDE / WORK_ENVIRONMENT / thin careers)
- `scripts/phase16c-apply.mjs` (idempotent applier)
- `tests/career-matching-16c.test.mjs` (19 tests)
- `scripts/audit/phase16c-career-data-baseline.{mjs,json,md}`
- `scripts/audit/phase16c-golden-before.json`, `scripts/audit/phase16c-golden-after.json`
- `scripts/audit/phase16c-golden-compare.mjs`

**Modified**
- `src/lib/career-matching/preferred-career.ts` (8 conservative aliases only)

**Untracked / excluded from commit (Phase 22 scans, never part of this phase)**
- `scripts/audit-phase22-data-integrity.mjs`, `scripts/audit-phase22-institutions.mjs`,
  `scripts/probe-golden-data.mjs`, `scripts/trace-golden-paths.mjs`

---

## M. Outstanding / honest limitations

1. Phase 16C enriches the **data layer**. The APTITUDE / WORK_ENVIRONMENT evidence
   only activates when a student produces the corresponding assessment signals;
   profile-only students see neutral (not penalised) scores, as verified in `score.ts:487`.
2. Occupational *environment* is expressed through Learning & Productivity signals,
   not bespoke occupation nouns — a conscious, reported mapping (section B), since
   those nouns could never match student output.
3. The tie-break confidence perturbation (section F) is a known, accepted side
   effect; it reorders equal-scored careers only.
4. Preferred aliases cover only the 8 unambiguous professional titles; several
   common everyday terms (e.g. `doctor`, `architect`, `accountant`) remain
   unresolved by design because no single career is defensible.