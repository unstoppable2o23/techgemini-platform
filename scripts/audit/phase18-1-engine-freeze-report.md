# Phase 18.1 — Career Engine Freeze & Regression Baseline Report

**Date:** 2026-09-03
**Commit:** `bc7894c` (baseline captured) → this phase marks the engine FROZEN for V1.
**Engine:** `src/lib/career-matching/` (engine / score / config / confidence / semantic-match / preferred-career / explain)
**Snapshot:** `scripts/audit/phase18-1-engine-freeze-baseline.json`
**Golden harness used:** `scripts/audit/phase16b-golden-harness.mjs` (23 profiles, real engine, real active catalog)

---

## 1. Engine classification

This engine is documented as:

> **"Deterministic, explainable, regression-tested recommendation engine."**

It is **NOT** claimed to be scientifically "perfect." It is **NOT** a probability, admission chance or validated percentage. The "Career Compatibility Score" is a directional heuristic based on how many declared career traits match the student's signals across 7 dimensions (INTEREST 0.25, SKILL 0.20, APTITUDE 0.15, PERSONALITY 0.10, SUBJECT 0.10, EDUCATION 0.10, WORK_ENVIRONMENT 0.05).

---

## 2. Freeze audit checklist

| Attribute | Status | Evidence |
|-----------|--------|----------|
| Deterministic | ✅ | Pure scoring (`scoreCareer`/`rankMatches` take no DB/random input); stable two-pass sort; determinism assertions in `career-matching.test.mjs` CASE 10, `career-matching-semantic.test.mjs` T34, `-harden` H*, `-16d` D5, `-new` STEP 17, medical-comprehensive. |
| Explainable | ✅ | `src/lib/career-matching/explain.ts` derives per-dimension reasons ("Strong {label} alignment", "development area", "missing evidence"); `sanitizeCareerMatch` strips internal `trace` before exposing to students. |
| Regression-tested | ✅ | ~13 dedicated career-matching test files (scoring, semantic, medical, 16a/16c/16d/16e, 16e1 data quality, harden). |
| Protected by tests | ✅ | Weights/thresholds/confidence constants asserted in `career-matching-16d`, `career-matching-semantic`, `career-matching-harden`. |
| No obvious data corruption | ✅ | `dataQualityCheck` on the harness audited **289 active careers, 0 with gaps** (all have interests, skills, personality, recommendedSubjects, recommendedDegrees, education pathway, CareerTrait records). |
| No accidental substring matching | ✅ | `LEXICAL_CONTAINS` is explicitly capped at strength 0.55 with a min-length-4 guard; whole-word regex avoids substring collisions; subset collisions route to LEXICAL_CONTAINS. |
| No score saturation | ✅ | Across all 23 profiles × top-20: **0 matches ≥90, 0 in 70–89, 0 in 1–29 bucket**. Distribution: 69 in 50–69, 351 in 30–49, 40 at 0. Highest observed score ≈62. |
| No confidence inflation | ✅ | Across all profiles × top-20: **0 HIGH, 20 MODERATE, 440 LOW**. No profile reached HIGH. |
| No alphabetic/random behavior | ✅ | Data-rich profiles yield family-relevant careers. Low-information profiles (U, W) return an honest score-0 low-evidence state rather than fabricated "recommendations." |

---

## 3. Baseline snapshot summary

Captured in `phase18-1-engine-freeze-baseline.json` (deterministic; safe to diff against on future engine changes).

- **Career count scored:** 289 (active)
- **Score distribution (all top-20 across 23 profiles):** `{"0":40,"90-100":0,"70-89":0,"50-69":69,"30-49":351,"1-29":0}`
- **Confidence levels:** MODERATE 20 / LOW 440 / HIGH 0
- **Top families (from `familyInventory`):** medicine 34, technology 38, engineering 29, environment 20, business 20, media 19, finance 16, design 14, etc. (20 families total; every active career assigned to a family).
- **Preferred-career behavior:** bounded boost — of the 6 golden profiles that declare a preferred career, only **3 forced rank #1** (M Medicine, N Software Engineering, P Law). I (Biotechnology→Biotech Research #4), O (Entrepreneur→Entrepreneurship #4), Q (Architect→Architecture #7) show the boost WITHOUT forcing #1 — confirming `PREFERRED_CAREER_BOOST = 12` is bounded and non-dominating.
- **Low-information behavior:** U (almost no data) and W (preferred-only, unresolvable free-text) return a score-0 state — the engine refuses to invent a recommendation without evidence.
- **Family diversity:** top-N family coverage documented per profile in the golden cases report; no single family herds out the top-5 for the human profiles.

---

## 4. Optional tuning knobs (FROZEN as-is for V1)

- `DIMENSION_WEIGHTS`, `SOURCE_WEIGHTS`, `PREFERRED_CAREER_BOOST`, `MATCH_TYPE_STRENGTHS`, `SINGLE_SIGNAL_CONTROL`, `EDUCATION_SCORING`, `CONFIDENCE_CONFIG`, `MATCH_STRENGTH_THRESHOLDS`, `SPECIFICITY_CONFIG` — all in `config.ts`, now FROZEN.
- `SPECIFICITY_CONFIG.enabled` is switchable via env but the default behavior (on) is the V1 frozen behavior.
- Do **not** change these during normal UI/product work.

---

## 5. Reasonableness review flags (see `phase18-1-golden-cases.md` for full detail)

- **P0: none.**
- **P1 (explicitly accepted/documented cross-family equal-score ordering, sales-demo credibility):**
  - H (mechanical) → Actuarial Science #1, Machine Learning #2.
  - L (psychology/social-science) → Brand Management #1.
  - Q (architecture/design) → Animation #1, Multimedia #2, preferred Architecture only #7.
- **P2 (reasonable but imperfect ordering):** B (lifescience not surfaced in top-10), R and V (technology family not in top-10 hits), and general equal-score ties.

These reflect the **family-scoped tie-break** design (`SPECIFICITY_CONFIG`): ranking discriminates *within* a family but never reorders *across* families, so a cross-family career that ties on score can win the top slot. This is intentional for family diversity and is FROZEN; no weight or algorithm change is made in this phase (a future phase may add cross-family differentiation).

---

## 6. Engine freeze policy (V1)

The career-matching engine is hereby **FROZEN for V1** as of this baseline. Any future change to scoring weights, dimension definitions, confidence rules, low-information behavior, preferred-career behavior, alias resolution, ranking, or school-stage neutrality requires:

1. a **new phase** with its own baseline,
2. a **regression comparison** against `phase18-1-engine-freeze-baseline.json`,
3. an **explicit written justification**,
4. **no silent behavior change** during normal UI/product work.

Do not continue tuning the engine during normal UI/product work.