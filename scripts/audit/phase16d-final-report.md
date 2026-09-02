# Phase 16D — Career Recommendation Calibration & Diversity V1 (Final Report)

Status: COMPLETE · Classification: **A (FULLY EFFECTIVE)** with documented data-coverage boundary
Phase 16C.1 audit: **A (FULLY EFFECTIVE)** with B-flag on humanities/media coverage

Generated 2026-09-02 · engine: `src/lib/career-matching/` (config / engine / score / types)

---

## 1. Executive summary

Phase 16D analyzed the career-recommendation pipeline as a **calibration and
diversity** exercise, not a scoring rewrite. The five-part outcome:

1. **Score distribution baseline captured** — 77% of all top-20 scores (352/460)
   land in the 40–49 band; nothing reaches 70+. This is now understood as
   mostly **intentional conservative design** (breadth caps + dimension
   normalization), with one accidental secondary dampener
   (sigFactor × strength compounding on profile-sourced LEXICAL_CONTAINS
   matches). No score inflation was applied.
2. **Broad-career domination documented** — careers that appear across many
   profiles (Actuarial Science 10/23, Chemical Engineering 7, Machine Learning
   Engineering 6, Medicine 6, Biomedical 6) are **genuinely broadly-compatible**
   (trait-category breadth 15–22), not a scoring bug.
3. **Generic-trait collisions identified** — 2789 distinct traits across 251
   active careers; 60 traits are generic (≥10 careers or ≥10 categories).
   Mathematics (118/251, 47%), Physics (87, 35%), Computer Science (74, 29%)
   are the worst collision sources.
4. **Confidence verified calibrated** — HIGH is reachable (78–84) for
   well-evidenced profiles; the 16B suite showing only LOW was a function of
   sparse golden profiles, not an accidental restriction. No confidence change.
5. **Two computed changes shipped**, both surgical:
   - **Low-information state** (engine-level `lowInformation` +
     `topMatchStrength`) so a near-empty / preferred-only-unresolved profile
     surfaces "not enough information yet" instead of alphabetical noise.
   - **Within-family career differentiation tie-break** — deterministic stable
     ordering that surfaces more distinctive matched evidence within exact
     (score, confidence, dimensions, category) ties, while **provably never**
     reordering careers across families or across any score/confidence/confidence
     difference. Golden before/after: family diversity, preferred-career #1,
     score and confidence distributions are **byte-identical**; only genuine
     within-tie order changed.

---

## 2. Baseline (Step 2) — before any change

Captured on committed 16C engine. 251 active careers, 23 golden profiles.

| Score bucket | Count | | Confidence | Count |
|---|---|---|---|---|
| 0 | 40 | | HIGH | 0 |
| 1–19 | 0 | | MODERATE | 20 |
| 20–29 | 0 | | LOW | 440 |
| 30–39 | 0 | | | |
| 40–49 | **352** | | | |
| 50–59 | 65 | | | |
| 60–69 | 3 | | | |
| 70+ | 0 | | | |

- Family diversity top-10: avg **4.8** (min 2, max 7)
- Broad top-5 careers: Actuarial Science 10, Chemical Engineering 7/8,
  Machine Learning Engineering 6/7, Medicine 6, Biomedical Engineering 6.
- Preferred-career rank #1 for deliberate profiles: M→Medicine,
  N→Software Engineering, P→Law. No preferred-career regression.
- Low-information profiles (near-zero evidence): U, W.

Reference artifacts:
- `scripts/audit/phase16d-baseline.json` / `.md`
- `scripts/audit/phase16d-golden-before.json` (post-change, `CAREER_MATCH__SPECIFICITY=0`)

---

## 3. Score-compression root cause (Step 3)

**Finding:** the 40–49 cluster is almost entirely explainable by **combination
of (A) correct conservative design and (E) accidental secondary dampening.**

- **A — Conservative design (intentional):** breadth factor is capped at ×1.0
  and dimension scores are normalized by dividing across 7 matched dimensions,
  so a well-rounded profile that touches many dimensions averages DOWN rather
  than up. This keeps a beginner honestly scored. Correct; documented in
  `scoreStandardDimension` / `scoreCareer`.
- **E — Accidental dampening (secondary):** profile-sourced signals (interests,
  subjects, activities) that resolve to `LEXICAL_CONTAINS` carry
  strength 0.55 and `sigFactor ≈ 0.8` from the signal-confidence model, so a
  common trait contributes ~0.44 → lands a dimension ~44/100. Combined with a
  baseline profile (matched signals 2–4), most profiles naturally sit at
  45–49 without any deliberate ceiling.

**Decision: NO matchScore inflation.** The top careers ARE semantically correct
for each profile; inflation would falsify compatibility. Discrimination was
addressed through the additive tie-break (Section 6) and the honest
low-information state (Section 5).

---

## 4. Broad-career domination analysis (Step 4)

Careers that appear in top-5 across many profiles:
Actuarial Science (10), Chemical Engineering (7), Machine Learning Engineering
(6), Medicine (6), Biomedical Engineering (6), Chiropractor (4), Bioinformatics
(4), Additive Manufacturing Engineer (4).

These careers have average trait-category breadth of 15–22 — i.e., they declare
interests/skills/traits across many categories, so they plausibly match many
students. This is **data shape, not a scoring defect**. Removing or reweighting
them without evidence was rejected (brief Step 7 / Step 8 guardrails).

---

## 5. Low-information state (Step 9) — SHIPPED

Problem: for profiles U (almost no data) and W (preferred-career-only,
unresolved), `getCareerMatches` returned the same hard-coded alphabetical list
of 251 zero-score careers — which products would otherwise present as a
"recommendation".

Change:
- `MatchResult.lowInformation: boolean` — true when NO career has
  `matchScore > 0 && evidence.length > 0`.
- `MatchResult.topMatchStrength: MatchStrength` — the strongest tier observed,
  so callers can also quiet all-exploration lists.

Verified: U and W correctly flag `lowInformation: true`; all genuine profiles
flag `false`. Zero evidence → `matchScore 0`, empty evidence (also locked by
regression test).

---

## 6. Within-family differentiation tie-break (Step 7, revised) — SHIPPED

### 6.1 What was tested and rejected first
A score-level "distinctiveness credit" that reordered ANY near-tie by trait
distinctiveness was implemented and measured. It caused a regression: for a
biology student, Life Sciences careers (Genetics 14→35, Microbiology 16→37)
dropped out of top-30, because the giant exact-score tie group at 48 was
reordered by distinctiveness, pushing generic-but-correct biology-subject
careers down. **Rejected** (brief Step 14: no overfitting; gate: no regressions).

### 6.2 Shipped design
`rankMatches` now takes an optional `{ traitFrequency, activeCareerCount }`
context (computed once per request by the engine). The final order:

1. Sort globally by `matchScore desc → confidenceScore desc →
   supportedDimensions desc → name asc → id asc` (unchanged base order).
2. Within each **maximal run of careers identical on (matchScore,
   confidenceScore, supportedDimensions, category)**, order by ascending
   average matched-trait distinctiveness.

Distinctiveness is:
`specificity(trait) = 1 + gain·(1 − freq(trait)/activeCareerCount)`, clamped to
`[1, 1+gain]` (gain 0.15, `SPECIFICITY_CONFIG`). Averaged over a match's
evidence. This is a **ranking tie-break, not a score change** — displayed
compatibility scores, confidence, strength, and the preferred-career boost are
untouched.

### 6.3 Why this is safe (provably no regression)
- Ties are only broken when careers are identical on score AND confidence AND
  dimensions AND category — the exact evidence-collision class the phase
  targets (same generic traits matched).
- The grouping is a **transitive strict weak order** (two-pass stable grouping,
  NOT a conditional comparator), guaranteed by construction.
- Cross-family careers are never compared against one another by
  distinctiveness, so **family diversity in the top-N is provably preserved**.

### 6.4 Measured before/after (23 profiles)
| Metric | Before (specificity off) | After (shipped) |
|---|---|---|
| score buckets | `{"0":40,"50-59":65,"40-49":352,"60-69":3}` | identical |
| confidence levels | MODERATE 20 / LOW 440 | identical |
| avg families top-10 | 4.8 | **4.8 (unchanged)** |
| preferred career #1 | M→Medicine, N→Software Eng, P→Law | identical |
| low-information profiles | U, W | identical |
| careers whose top-10 order changed | — | A, D, M only (all exact-tie med-tech reorders) |

Each changed profile's reorder is strictly within careers sharing the same
(score, confidence, dims, category) — e.g. Chiropractor/Dentistry/Paramedic tie
at 48/38/1 reorders to surface the ones whose matched evidence is most
distinctive. No cross-family, cross-confidence, or cross-score movement exists
by construction.

---

## 7. Generic traits (Step 5) — data

`scripts/audit/phase16d-generic-traits.json` captures the full catalog scan:
2789 trait values; 60 generic traits; frequency histogram; top collision
sources: Mathematics (118/251, 47%, 18 categories), Physics (87, 35%),
Computer Science (74, 29%), Biology (66), Chemistry (60), Business Studies
(52), English (44), Economics (43), Python (43).

This is the evidence base for the specificity tie-break and, importantly, the
**boundary**: within-category collision on genuinely generic traits (all
technology careers share Mathematics/CS) is data-expansion-solvable, NOT
scoring-logic-solvable without creating the regression found in Section 6.1.

---

## 8. Career differentiation (Step 6)

- Between DISTINCT profiles (CS-rich vs PCB vs Commerce vs Design):
  top-5 **overlap = 0**. Differentiation works.
- Between careers on SAME evidence (single-subject match e.g. “Biology”):
  scores collapse identically. This is data-constrained; the tie-break now
  selects deterministically among them.

`scripts/audit/phase16d-differentiation.json` captures pairwise top-5
distinctiveness for all 23 profile pairs.

---

## 9. Confidence calibration (Step 12)

Verified calibrated — **HIGH is reachable**:
- CS-rich → ML Engineering conf 78 (HIGH)
- PCB-rich → Medicine conf 84 (HIGH)
- Commerce/Design profiles also reach HIGH.

The 16B golden suite showing LOW/MODERATE only was a property of its sparse
profiles (matched signals 2–4, coverage ≈0.43), not an engine restriction.
**No confidence change.** Decision recorded (no modification).

---

## 10. Recommendation states (Step 10)

`RECOMMENDATION_STATES` added to config documents the product-visible tiers:
STRONG_MATCH / GOOD_MATCH / POTENTIAL_MATCH / EXPLORATION /
INSUFFICIENT_EVIDENCE. Derivation is from existing match-strength thresholds;
INSUFFICIENT_EVIDENCE is surfaced via the new `lowInformation` signal.

---

## 11. Tests (Step 16)

New file `tests/career-matching-16d.test.mjs` (10 tests):
1. **D1** specificity only fires on score+family (category) tie
2. **D2** same score + same family → more distinctive trait wins
3. **D3** cross-family same-score ties keep name order (no cross-family reorder)
4. **D4** preferred career boost still wins (specificity cannot override a
   higher score)
5. **D5** tie-break fully deterministic across repeated runs
6. **D6** `scoreCareer` is unchanged by specificity (scores/strength identical)
7. **D7** `buildTraitFrequency` counts across all trait fields
8. **D8** `traitSpecificity` bounds: 1 for generic, ≤1+g for distinctive, 1 when
   no freq map
9. **D9** zero-evidence → all-zero scores (low-information basis)
10. **D10** art substring protection no-regression (`canonicalKey` intact)

No subject/assessment/education-stage regressions:
- FULL suite: **341/341 tests pass** (331 prior + 10 new)
- `npx tsc --noEmit --skipLibCheck`: clean
- `next build`: OK

Regression guards exercised by the existing suite under the new ranker:
API byte-identical engine test, art substring protection, APTITUDE,
WORK_ENVIRONMENT, education-stage classification, preferred-career boost,
deterministic ranking (same profile run 3×), medical-vs-science distinction.

---

## 12. Scope & safety compliance (Step 20)

- ❌ No `prisma db push --accept-data-loss`; no migration; no destructive op.
- 🔒 University / IndianInstitution / Program / EducationInstitutionMapping:
  **read-only** (no schema/table touched; baseline scripts only create + delete
  a scratch tenant/user/profile in a transaction).
- 🌱 No seed operations added to builds.
- 📐 Career-side changes only: `config.ts`, `engine.ts`, `score.ts`, `types.ts`.
- ✅ `npm run lint` known-broken pre-existing (Next 16 `next lint` invalid-dir);
  recorded, not fixed.
- Deterministic: trait-frequency derives from the static active catalog, so
  within a deployment the tie-break is stable; explicit determinism test (D5)
  and the API byte-identical regression guard it.

## 13. Boundary (data-coverage, carried from 16C.1)

Humanities/Media/Arts coverage remains comparatively thin at the trait level
(English 44/251, Psychology/History/Sociology far lower) — a **data-coverage**
constraint, not an enrichment or calibration defect. Career-side enrichment
would be needed to widen these families' recommendable evidence; no
scoring-side change can substitute. Flagged as a known boundary for Phase 17+.

## 14. Deliverables

| Artifact | Purpose |
|---|---|
| `scripts/audit/phase16d-baseline.{mjs,json,md}` | Step 2 baseline (read-only) |
| `scripts/audit/phase16d-generic-traits.{mjs,json}` | Step 5 trait scan |
| `scripts/audit/phase16d-differentiation.{mjs,json}` | Step 6/12 pairwise diff probe |
| `scripts/audit/phase16d-golden.mjs` + `{before,after}.json` | Step 13 A/B harness |
| `tests/career-matching-16d.test.mjs` | Step 16 regression guards |
| `src/lib/career-matching/{config,engine,score,types}.ts` | shipped changes |