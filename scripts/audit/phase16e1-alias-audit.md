# Phase 16E.1 — Alias Audit

**Review:** the `PREFERRED_CAREER_ALIASES` map — every alias must resolve to exactly one
career, and explicitly-excluded aliases must stay unresolved.

## Method
`scripts/audit/phase16e1-alias-audit.mjs` scans each required alias against the full
289-career catalogue and checks the configured alias→career resolution, reporting any
ambiguity or failure.

## Results
All **13 `PREFERRED_CAREER_ALIASES`** resolve **uniquely** to their target career:

| Alias input | Resolved career | Status |
|---|---|---|
| software engineer | Software Engineering | OK |
| civil engineer | Civil Engineering | OK |
| data scientist | Data Science | OK |
| lawyer | Law | OK |
| physician | Medicine | OK |
| psychologist | Psychology | OK |
| (remaining preferred-career aliases) | … | OK (unique) |

No required alias resolves to multiple careers. Token-overlap "candidates" reported during the
scan (e.g. the many `* Engineer` / `* Management` names) are **distinct records**; the
explicit alias map disambiguates them correctly.

## Excluded aliases (must stay unresolved)
`Doctor`, `Architect`, `Accountant`, `Management Consultant` are deliberately **not**
in the alias map and remain unresolved to avoid mis-mapping onto the generic
`Medicine` / `Architecture` / finance / consulting careers. Verified: they do **not** false-match.

## Guardrails (test 12)
- `art` as alias input does **not** false-match `Fine Arts` or `Art` (passes).

## Conclusion
Alias resolution is unambiguous and correct. No alias corrections were required;
Phase 16E.1 makes no changes to the alias map.