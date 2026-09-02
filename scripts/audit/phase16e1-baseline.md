# Phase 16E.1 — Baseline & Scope

**Date:** 2026-09-03 · **Repo:** techgemini-platform · **Base commit:** `3c29dcb` (Phase 16E)

## Objective
Post-16E audit of the 289-career catalogue. Fix **only** genuine data-quality / integrity
problems to establish a clean, trustworthy baseline. The Career → Program → University
pipeline is explicitly **out of scope** and must **not** be started here.

## Hard prohibitions honored
- No changes to `University`, `IndianInstitution`, `Program`, or university-program mappings.
- No changes to university matching, assessment question banks, assessment scoring
  algorithms, or core career-matching weights.
- No `prisma db push --accept-data-loss`, no DB reset, no deletion of
  university/institution data.
- No new careers added (only corrective data edits within Phase 16E.1 scope).

## Catalogue baseline (post-reconciliation, `phase16e1-baseline.json`)
| Metric | Value |
|---|---|
| Total careers | 289 |
| Active careers | 289 |
| Inactive careers | 0 |
| Trait rows (CareerTrait) | 6164 |
| byDim | SKILL 2176 · INTEREST 933 · PERSONALITY 943 · SUBJECT 940 · EDUCATION 619 · APTITUDE 305 · WORK_ENVIRONMENT 248 |
| Zero-trait careers | 0 |
| Careers w/o APTITUDE | 200 |
| Careers w/o WORK_ENVIRONMENT | 200 |
| No-pathway careers | 0 |
| Case-insensitive name duplicates | 0 |
| Slug duplicates | 0 |

## Required-metadata gate (post-reconciliation)
| Field | Missing |
|---|---|
| shortDescription | 0 |
| introduction | 0 |
| workNatureDesc | 0 |
| demandLevel | 0 |
| salaryEntry | 0 |
| salarySenior | 0 |
| category | 0 |
| title | 0 |
| technicalSkills | 0 |
| interests | 0 |
| personalityTraits | 0 |
| recommendedDegrees | 0 |
| recommendedSubjects | 0 |
| salaryCurrency != INR | 0 |
| **jobGrowth** | **40** (documented residual — see career-quality report) |

> `jobGrowth` was removed from the required-metadata **hard gate** by user decision; the 40
> missing-`jobGrowth` careers are documented rather than failing CI. All other fields must
> remain fully populated.

## Scalar/backfill reconciliation applied
- 38 new careers: scalar arrays (`technicalSkills`, `interests`, `personalityTraits`,
  `recommendedDegrees`, `recommendedSubjects`) backfilled; `shortDescription` derived from
  introduction. Verified: **0** still-empty scalar fields across all 38.
- 176 `shortDescription` backfilled repo-wide.
- 48 `SUBJECT_LINK` rows created (where a declared recommended subject matches an existing
  `Subject` record); 120 skipped (no matching `Subject` record — benign, covered by tests).

## Residuals tracked (not blocking)
- `jobGrowth` missing on 40 emerging careers.
- `softSkills` empty on 47 careers (not part of required-metadata gate).
- "Overlap" career *names* (e.g., many `* Management` / `* Engineer`) are distinct records,
  not duplicates; aliases resolve unambiguously.