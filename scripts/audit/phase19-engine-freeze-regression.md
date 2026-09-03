# Phase 19 — Engine Freeze Regression Report

**Date:** 2026-09-03

## Requirement (§20)

Run the Phase 18.1 engine freeze baseline and confirm: same career scores, same confidence, same recommendation ordering, same low-information behavior, same preferred-career behavior. **No recommendation changes allowed.** If any change → STOP and investigate (do not just update the baseline).

## Method

- Re-ran the golden harness: `node --import ./scripts/register-loader.mjs scripts/audit/phase16b-golden-harness.mjs --out=<phase19-golden.json>` (23 profiles, real engine, real catalog, transient students).
- Byte-compared the new output to the committed baseline `scripts/audit/phase18-1-engine-freeze-baseline.json`.
- Parsed both as JSON and compared the full normalized result set (all per-profile top matches, scores, confidence, ordering, low-info signals, preferred-career ranks, aggregate buckets, family inventory, data-quality scan).

## Result

| Check | Expected | Actual |
|---|---|---|
| Total output bytes | identical | 628,407 = 628,407 ✅ |
| Content lines (excl. `generatedAt` metadata) | identical | 19,546 = 19,546 ✅ |
| Semantic JSON (normalized) | identical | identical EXCEPT `generatedAt` timestamp ✅ |
| Recommendation scores | same | same ✅ |
| Confidence levels | same | 0 HIGH / 20 MODERATE / 440 LOW (unchanged) |
| Recommendation ordering | same | same ✅ |
| Low-information behavior | same | same (score-0 buckets: `{"0":40,...}` unchanged) |
| Preferred-career behavior | same | `preferred ranked #1` identical (M:Medicine, N:Software Eng, P:Law) |
| matchScore buckets | same | `{"0":40,"50-69":69,"30-49":351}` unchanged |
| Data quality (289 careers, gaps) | 0 gaps | 0 gaps ✅ |

**The only difference between the two runs is the `generatedAt` metadata timestamp.** Every engine output value — scores, confidence, ordering, low-information behavior, preferred-career behavior, aggregate distribution — is **byte-identical**.

## Conclusion

**§20 ENGINE FREEZE REGRESSION: PASS. ZERO recommendation changes.**

No engine weights, assessment scoring, career database, University/IndianInstitution, or Program data were modified in Phase 19. The regression confirms the engine output is stable and the recommendation system is untouched.

## Guard rails preserved

- The Phase 18.1 immutability tests (`tests/engine-freeze-immutability.test.mjs`) still pass in the full suite (§21).
- No new intelligence or catalog changes were introduced this phase.