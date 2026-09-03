# Phase 21 — Country Logic Audit

## Supported destinations
`SUPPORTED_DESTINATIONS = [INDIA, USA, UK, CANADA, AUSTRALIA, GERMANY, IRELAND,
NEW_ZEALAND]` in `src/lib/roadmap/country-config.ts`.

## `resolveDestination()`
- Prefers the student's explicit `targetCountry` when it is in the supported set.
- Otherwise falls back to `preferredDestination` from the profile.
- Returns a normalized destination string used to select the pathway; an
  unsupported/blank destination defaults to `INDIA` for a conservative default.

## `requirementQuestions()`
Returns a stable list of "what to check" questions per country (e.g.,
language-test eligibility, entrance test, visa, cost, deadlines). These are
phrased as checks — never asserted facts.

## `COUNTRY_PATHWAYS`
Each of the 8 destinations has:
- a label / flag label,
- the relevant standardized/admission-test signals (framed conservatively),
- education-stage-aware entry points,
- conservative "check" wording for costs, visas, and deadlines.

## Tests
- `resolveDestination` recognized for all 8 supported values and defaults for
  unsupported values.
- `SUPPORTED_DESTINATIONS` completeness asserted.
- Destination-specific requirements are conservative (no fabrication).

## Freeze note
`country-config.ts` only reads profile + career-program/university inputs. It
does not modify `Program`, `University`, or `IndianInstitution` data, and it
never alters the career-engine output it consumes.
