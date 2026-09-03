# Phase 21 — Trending Careers Audit

## Trending data (frozen, consumed — not modified)
| Metric | Value |
|---|---|
| CareerTrend rows | 251 |
| Careers with trend data | 251 |
| row.trending = true | 168 |
| row.emerging = true | 72 |
| row.fastGrowing = true | 43 |
| row.futureFacing = true | 251 |
| Careers marked isEmerging | 81 |

Trending reads the existing `CareerTrend` model + `Career` fields
(`interests`, `technicalSkills`, `softSkills`, `category`, `subcategory`,
`recommendedDegrees`, `recommendedSubjects`, `isEmerging`, `futureOutlook`,
`demandLevel`, `jobGrowth`, `relatedCareers`, `alternativeCareers`). It never
writes to these.

## Two views
- **"Trending for You"** (`foryou`): sufficient-information student — has a
  completed assessment (TestResult) and/or a career goal. Personalized by
  education stage, subjects, interests, career family, and destination.
- **"Trending Careers"** (`trending`): low-information student with no
  assessment and no career goal. Shows general trending with an honest
  limitations note ("add subjects/interests or complete an assessment to see
  trending personalized to you").

## Relevance scoring
`scoreRelevance` returns a `TrendRelevanceScore` **separate from the core
matchScore**. Signals: education-stage category gate, career-family overlap,
subjects studied/enjoyed, activity interests, destination context, and trend
classification overlap. `MIN_RELEVANCE_SCORE = 30`: careers below the floor are
excluded, so popular-but-unrelated careers are filtered out.

## Explainability & connection
- `buildTrendReason` → "why trending".
- `buildRelevanceReason` → "why relevant to you".
- Destination context is surfaced.
- Trending is a discovery layer that links into the roadmap ("explore → plan
  next steps"), but it never auto-changes the preferred career and does not write
  a roadmap by itself.

## Freeze guarantees
- `relevanceScore` is never merged into `matchScore`.
- Trending does not alter matchScore/confidence/ranking.
- Generating trending does not change the student's preferred career and does not
  create a roadmap/step.
- No fabricated trend statistics, admissions requirements, costs, or deadlines.

## Files
- `src/lib/career-trends/personalization.ts` (new discovery layer)
- `src/app/api/student/trending/route.ts` (STUDENT-only)
- `src/app/dashboard/student-intelligence-hub.tsx` (dashboard UI)
- `src/lib/student/dashboard.ts` (dashboard data wiring)
