# Phase 22 — Engine Freeze Regression Report

**Date:** 2026-09-04

## Requirement

The core engine layers (career matching, assessment scoring, CareerTrait, ranking, confidence, career→program, trending, study roadmap) are **frozen**. Phase 22 must introduce **zero** recommendation changes. Any change → STOP and investigate.

## Method

- Re-ran the golden harness (`scripts/audit/phase16b-golden-harness.mjs`, 23 profiles, real engine, real catalog, transient students), writing output to a temp file.
- Byte-compared the result to the committed frozen baseline `scripts/audit/phase18-1-engine-freeze-baseline.json`.
- Also compared semantically with the `generatedAt` metadata timestamp excluded.

## Result

| Check | Expected | Actual |
|---|---|---|
| Total output bytes | identical | 628,407 = 628,407 ✅ |
| Semantic JSON (excl. `generatedAt`) | identical | identical ✅ |
| Recommendation scores | same | same ✅ |
| Confidence levels | same | `{"MODERATE":20,"LOW":440}` unchanged |
| matchScore buckets | same | `{"0":40,"50-69":69,"30-49":351}` unchanged |
| Recommended ordering | same | same ✅ |
| Low-information behavior | same | 40 score-0 buckets unchanged |
| Preferred-career behavior | same | `M:Medicine@#1, N:Software Engineering@#1, P:Law@#1` |
| Data quality | 289 careers, 0 gaps | 0 gaps ✅ |

The only difference between runs is the `generatedAt` metadata timestamp. Every engine output value is **byte-identical**.

## Phase-22 engine/origin changes

None to the engine, assessment, Career, Program, University, or IndianInstitution data. The only new modules are pilot-ops surface (`csv-import.ts`, `invitation.ts`), new DB tables (`StudentInvitation`, `SupportTicket`), and UI/routes.

## Conclusion

**§ ENGINE FREEZE REGRESSION: PASS — ZERO recommendation changes.** The frozen engine is untouched by Phase 22.
