# Phase 16E.1 — Career Quality Report

**Review:** name/slug uniqueness, category validity, required metadata, scalar completeness,
and description quality across all 289 active careers.

## Uniqueness & identity
- 0 duplicate names (case-insensitive) · 0 duplicate slugs.
- All careers have a valid `category` and `title`.

## Required metadata
All required fields are populated for every active career **except** `jobGrowth` (below).
This gate is enforced by `tests/career-data-quality-16e1.test.mjs` (tests 3–16).

## jobGrowth residual (40 careers — intentionally non-gated)
The following careers lack a `jobGrowth` value. These are predominantly Phase 16E emerging /
new-age roles whose growth outlook is qualitative rather than a single percentage string.
Per the Phase 16E.1 decision, these are **documented, not blocking**; filling them is deferred
to the future Career → Program → University editorial pipeline.

Additive Manufacturing Engineer, AI Governance Specialist, Algorithmic Trading Developer,
Autonomous Systems Safety Engineer, Autonomous Vehicles Engineer, Battery Technology Engineer,
Carbon Markets Analyst, Climate Risk Analyst, Cloud Security Engineer, Cloud Solutions Architect,
Computational Biologist, Computer Vision Engineer, Cryptography Engineer, Data Governance
Analyst, Digital Twin Engineer, Edge Computing Engineer, Embedded Systems Engineer, Energy
Efficiency Consultant, ESG Analyst, Genomic Data Scientist, Green Hydrogen Engineer, High
Performance Computing Engineer, Human-AI Interaction Designer, Humanoid Robotics Engineer,
IoT Security Engineer, Medical AI Engineer, MLOps Engineer, NLP Engineer, Payments Engineer,
Penetration Tester, Quantitative Analyst, Security Operations Analyst, Semiconductor Process
Engineer, Smart Grid Engineer, Solar Energy Engineer, Surgical Robotics Engineer, Synthetic
Biology Engineer, Telehealth Specialist, VLSI Design Engineer, Wind Energy Engineer.

## shortDescription
- **0** careers missing `shortDescription` post-reconciliation (176 backfilled, 38 new-career
  defaults). Every active career now exposes a short, intro-derived summary.

## Scalar completeness
| Array | Empty careers |
|---|---|
| technicalSkills | 0 |
| interests | 0 |
| personalityTraits | 0 |
| recommendedDegrees | 0 |
| recommendedSubjects | 0 |
| softSkills | 47 (legacy, non-gated) |

`recommendedDegrees` is fully populated across the catalogue (289/289) after the legacy
education-taxonomy cleanup (see education-quality report).

## veracity notes
- Salary currency is `INR` on all 289 careers.
- No `whoShouldPursue` / `eligibility` anomalies surfaced; all careers retain their Phase 16E
  narrative content.
- Quality gate result: **pass** (16/16 Phase 16E.1 tests).