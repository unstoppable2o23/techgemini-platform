# Phase 16E.1 — Education Quality

**Review:** `recommendedDegrees` and `recommendedSubjects` integrity, and the
education-taxonomy rule (no malformed combined tokens in `recommendedDegrees`).

## Legacy malformed-token cleanup
The education-taxonomy gate (test 8) forbids malformed `recommendedDegrees` tokens:
1. `B.Tech/B.E.` combined into one token
2. `BCA/MCA` combined into one token
3. `Any degree` fragments

**Baseline defect:** ~180 tokens across 140 careers violated these rules.

**Correction:** `scripts/phase16e1-data/_rewrite-legacy-deg.mjs` rewrote the **3 forbidden
patterns only**, preserving all informative suffixes and all other well-formed tokens.

| Statistic | Value |
|---|---|
| Careers rewritten | 139 |
| Tokens changed | 178 |
| Tokens dropped | 1 (`Library Sciences` bare `ANY degree` → empty, valid) |

Examples (all conservative, suffix-preserving):
- `B.TECH/B.E. Computer Science` → `B.Tech Computer Science`
- `BCA/MCA + certifications` → `BCA + certifications`
- `Any degree + PMP/PRINCE2/CSM certification` → `PMP/PRINCE2/CSM certification`
- `Any degree (Physics/Maths) + ATC training via AAI (ATC exam)` → `ATC training via AAI (ATC exam)`

**Result:** `malformedDegreeTokens = 0` (re-verified in `phase16e1-trait-education-dup.json`).
The forbidden patterns are **not reintroduced** anywhere.

## recommendedDegrees coverage
- **289/289** active careers have a non-empty `recommendedDegrees` array.
- **0** careers with an empty degree list after cleanup.

## recommendedSubjects & education pathways
- All careers declare `recommendedSubjects` (0 empty).
- **0** inactive degree-pathway rows, **0** careers lacking a degree pathway.
- Reconcile created **48** `SUBJECT_LINK` rows (exact-match to existing `Subject` records);
  120 subjects had no corresponding `Subject` record and were correctly skipped
  (no fabricated subject records — per scope).

## Pre-existing out-of-scope test note
`tests/education-pathways.test.mjs` ("orphan education pathways") asserts every career with
`recommendedSubjects` has ≥1 `SUBJECT_LINK`. **Corporate Law** declares subjects
(`Business Law`, `Contract Law`, `Corporate Governance`, …) that have **no matching `Subject`
record**, so it has 0 links. This is a **pre-existing gap from Phase 16E source data**, not
introduced by Phase 16E.1, and falls **outside** this phase's scope (subject-level authority
data). It is documented here rather than "fixed" by fabricating subject records.

## Conclusion
Education data is now taxonomy-clean and fully populated. The only residual is the documented,
out-of-scope `education-pathways` orphan mapping for subjects without a canonical `Subject`
record.