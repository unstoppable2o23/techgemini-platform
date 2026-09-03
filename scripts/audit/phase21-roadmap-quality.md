# Phase 21 — Roadmap Quality Audit

## Step quality invariants
Every generated road-step satisfies the following invariants (enforced and
tested in `tests/phase21-roadmap.test.mjs`):

- Every step has a non-empty `title` and `description`.
- Every step carries `category`, `priority` (HIGH/MEDIUM/LOW), `timeHorizon`
  (NOW / NEXT_3_MONTHS / NEXT_6_12_MONTHS / LONGER_TERM), and `status`.
- Steps are grouped by milestone in `MILESTONE_ORDER` and ordered by horizon
  within a group (opportunity ordering: NOW → NEXT_3_MONTHS →
  NEXT_6_12_MONTHS → LONGER_TERM).
- Steps are de-duplicated by title.
- No step contains guaranteed admission, scholarship, visa, or employment
  language.
- No step fabricates a deadline, cost, or admission requirement; exams appear
  only with `REQUIRED` / `RECOMMENDED` / `MAY_APPLY` / `CHECK` reliability
  phrasing.
- Destination-specific requirements are conservative and phrased as checks
  (e.g., "Check whether [country] requires an English-proficiency test for your
  target program"), never asserted as fact without evidence.

## Progress semantics
`computeProgress` counts only `COMPLETED` steps as done; `SKIPPED` and
`NOT_APPLICABLE` steps do not count toward progress so a student is never shown a
misleadingly high percentage.

## Regeneration semantics
`regenerateRoadmap` rebuilds FUTURE steps while preserving:
- `COMPLETED` steps (a student's finished work is never re-issued);
- counselor-added steps;
- the current destination and goal.

## Education sequencing
Stage-aware switching prevents impossible staging:
- `SCHOOL_CLASS10` → exploration + foundation only, no postgraduate steps.
- `SCHOOL_CLASS12` → stream choice, core subjects, board exams, entrance-exam
  planning, shortlist, and application.
- `UNDERGRADUATE` / `POSTGRADUATE` → program comparison, specialization,
  internships/projects, and (for PG) coursework targets.
- `CAREER_SWITCHER` → skills bridging, credential alignment, and portfolio work.
- `UNKNOWN` → profile-completion prompt before any concrete career step.

## Golden roadmap results
The golden-profiles suite (`tests/phase21-golden-profiles.test.mjs`) seeds ten
realistic profiles (Class 10 science, Class 12 commerce/humanities/biology,
engineering UG, CS UG, psychology, media, architecture, low-information) and
verifies:
- every profile generates at least 3 conservative steps;
- no `guarantee` language anywhere;
- every step has category/priority/horizon/status;
- school students have no postgraduate steps.

Result: 24/24 pass in the golden suite (roadmap + trending assertions combined).
