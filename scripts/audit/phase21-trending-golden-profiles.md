# Phase 21 — Trending Golden Profiles Audit

## Method
Ten golden student profiles are seeded as transient users (unique tenant, created
inactive and deleted in `after()` so they never pollute the active-tenants scan).
Each profile drives the real `getStudentTrendingCareers()` + `generateRoadmap()`
against the real 289-career catalog with real `CareerTrend` data.

Profiles: class10_science, class12_commerce, class12_humanities,
class12_biology, engineering_ug, cs_ug, psychology, media, architecture, and a
low-information profile.

## Assertions verified (24 golden tests: trending + roadmap)
- **foryou view** for every sufficiently-informational profile; every returned
  item has a relevanceScore ≥ MIN_RELEVANCE_SCORE and both a `relevanceReason`
  and `trendReason`.
- **low-information** profile returns the honest `trending` view with a
  limitations note explaining why it is not personalized.
- **Engine freeze**: generating trending leaves `preferredCareer`/
  `preferredCareerId` byte-identical, and does not write any roadmap row.
- **relevanceScore is independent of matchScore** (bounded 0–100, never exposed
  as matchScore, never an overclaim).
- **roadmap** generates conservative, stage-appropriate, non-guarantee steps for
  every profile; school students get no postgraduate steps.

## Result
All golden-profile assertions pass. Combined suite (roadmap + trending golden):
24/24.

## Trending test suite (standalone)
`tests/phase21-trending.test.mjs` — 19/19 pass covering: education-stage
relevance across 11 stage/subject profiles, low-information view, relevance
threshold, determinism (stable ordering), program mapping from existing
`recommendedDegrees` data, fame/separation from matchScore, and engine freeze
(no preferredCareer change, no roadmap write).
