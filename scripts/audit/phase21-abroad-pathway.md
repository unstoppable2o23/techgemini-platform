# Phase 21 — Abroad Pathway Audit

## Design principles (Abroad)
For an abroad destination (`USA`, `UK`, `CANADA`, `AUSTRALIA`, `GERMANY`,
`IRELAND`, `NEW_ZEALAND`) the roadmap uses the shared `COUNTRY_PATHWAYS` config
and stays conservative:

- **Country selection** is resolved via `resolveDestination()` from
  `targetCountry`, falling back to the student's preferredDestination.
- **English-proficiency test** (IELTS / TOEFL / PTE / Duolingo) is framed as a
  `CHECK`/`MAY_APPLY` step — "check whether [country] requires an English-
  proficiency test for your target program" — never asserted as a mandatory fact
  without evidence.
- **Standardized admissions** (country-specific entrance tests) are surfaced only
  with `MAY_APPLY` / `CHECK` phrasing when present in the pathway config.
- **Cost / visa / deadline** steps use `CHECK` phrasing and never invent numbers.
- **Visa clearance** is a checklist step, never a guarantee of approval.

## Non-fabrication guarantees (Abroad)
- No fabricated fee, cost of attendance, or visa timeline.
- No guaranteed admission or admission chance.
- Every country-specific requirement is a check against official sources.

## Covered in tests
- `abroad english-test check-only phrasing` — verifies the language test step is
  phrased as a check, not an assertion.
- `destination-specific abroad requirements are conservative`.
- Golden profiles with `targetCountry` set resolve the destination without
  fabricating requirements.
- All 8 destinations are recognized by `SUPPORTED_DESTINATIONS` / country-config
  tests.
