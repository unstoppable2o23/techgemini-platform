# Phase 26 — End-to-End Student Career Journey + Roadmap Integration (v1)

## Scope
A deterministic, DB-derived career journey (Profile → Assessments → Career Discovery → Programs → Universities → Roadmap → Progress) with a colored dashboard section, "Build my pathway", a deterministic next-best-action, counselor visibility, and journey analytics events. The headless matching engine stays frozen; the journey only reads its outputs.

## Design invariants
- The journey is **computed, never stored**. Every value derives from persisted rows (`StudentProfile`, `TestAssignment`, `ProductEvent`, `StudentShortlist`, `StudentRoadmap` + steps, appointments). Refresh/login recomputes identically (verified by test 14).
- No journey table, no new career-preference tables. "Build my pathway" reuses `StudentProfile.preferredCareerId` (existing field) then regenerates the roadmap around it via `regenerateRoadmap` (the roadmap service already targets `preferredCareerId` first). It does NOT call `saveCareerPreferences` (that path has onboarding-finalize gates).
- "Build my pathway" does not touch scoring/matching. Career selection state reuses existing signals: explored = `career_detail_opened` events, shortlisted = `StudentShortlist`, preferred = `preferredCareerId`.
- Part 13 priority contract for the next-best action (deterministic):
  `complete_profile` → `take_assessments` → `explore_matches` → `select_pathway` → `build_roadmap` → `continue_roadmap` → `shortlist_careers` → `shortlist_universities` → `journey_complete`/`review_with_counselor`.

## Architecture
- `src/lib/student/journey-state.ts` — NEW. Pure `computeJourneyState(inputs)` + `resolveNextBestAction` + `buildAvailableActions` (actions only exist when the underlying data exists — no dead-end CTAs), plus server loaders `getJourneyState(userId, {careerMatches?})` (accepts caller-provided matches so the engine is never run twice) and `assessCareerJourneyStates`.
- `src/lib/student/journey.ts` — now a compat re-export of journey-state. The legacy component/view (`src/components/student/journey.tsx`, `buildStudentJourney`, `StudentJourney` type) was deleted.
- `src/lib/student/pathway.ts` + `src/app/api/student/journey/career-path/route.ts` — NEW. `setStudentPathway` validates the career + existing `StudentProfile`, writes `preferredCareer`/`preferredCareerId`, records `pathway_started`, regenerates the roadmap (best-effort), redirects to `/roadmap`. STUDENT-only route.
- `src/lib/student/basics.ts` — `computeProfileCompleteness` exported (was private).
- `src/components/student/journey-section.tsx` — NEW client UI: next-best-action banner, top-4 action chips, six step cards with color + text labels (color is never the only signal), header progress ring. Fires `journey_step_viewed` (mount) and `next_best_action_clicked` (CTA).
- `src/components/student/build-pathway-button.tsx` — NEW shared CTA (POSTs the career-path route, navigates to roadmap). `alreadyPreferred` renders a static "This is your pathway" chip.
- Dashboard: `src/app/dashboard/page.tsx` computes `getJourneyState` passing the already-computed `dashboard.topCareerMatches`; `student-intelligence-hub.tsx` renders `JourneySection` in place of the old inline journey + Next-Steps.
- Career surfaces: recommendation-card (`journey` chips: Your pathway / Shortlisted / Explored + SaveButton + BuildPathwayButton), career-matches client + API (journey map per career), career-library detail page + client (single-career journey state server-side).
- Roadmap client: fires `roadmap_action_completed` on successful mark-complete; "Choose your pathway" CTA when no goal career exists.
- Counselor 360: `getStudent360` gains a `journey` block (computed via `getJourneyState`, reusing its own `careerMatches`); student-360-client shows Journey/Roadmap stats in the summary bar + a Career Journey card with the next best action.
- Analytics: allowlists extended in `record.ts`, `client.ts`, and the events API with `journey_step_viewed`, `career_shortlisted`, `pathway_started`, `university_shortlisted`, `roadmap_action_completed`, `next_best_action_clicked`. Shortlist POST records `career_shortlisted` / `university_shortlisted` server-side.

## Verification
- `npm run typecheck` — clean.
- `npm run build` — clean.
- `npm test` — **680/680 pass** (661 before Phase 26 + 19 new). `tests/phase26-journey.test.mjs` covers:
  1. empty state (complete_profile + locked downstream)
  2. profile-only → take_assessments
  3. assessments full, no evidence → explore_matches
  4. top match → discovery done, downstream unlocked
  5. matches but no pin → select_pathway
  6. pinned career, no roadmap → build_roadmap
  7. partial roadmap → continue_roadmap beats shortlist (priority)
  8. roadmap done → shortlist_careers
  9. full journey without appointment → review_with_counselor
  10. full journey + appointment → journey_complete
  11. actions gated on data (no dead-end CTAs)
  12. step order fixed, trailing progress summary
  13. DB aggregation of shortlist/explored/preferred
  14. same rows → identical journey (refresh/login determinism)
  15. assessCareerJourneyStates explored/shortlisted/preferred flags
  16. new analytics events persist
  17. setStudentPathway persists preferred career + regenerates roadmap; progress reflects step completion
  18. getStudent360 journey block (steps, next best action, engine reuse)
  19. engine determinism (identical matches twice) + MBBS (Medicine (MBBS)) vs BDS (Dentistry (BDS)) vs Nursing program distinctness + education-stage/diploma detection
- Freeze verification — `scripts/audit/phase16b-golden-harness.mjs` run twice, normalized (ignoring `generatedAt`): **IDENTICAL_TO_FREEZE_BASELINE=YES**.
- Dataset counts unchanged: University 20, IndianInstitution 73,969, Career 289, Subject 59, Program 80, CareerEducationPathway 2111, CareerProgramMapping 856.

## Notes
- `npm run lint` is still broken (Next 16 removed `next lint`) — pre-existing, documented, not part of this phase.
- Test fixture tenants carry a Trial subscription so the global "every active tenant has a subscription" invariant (b2b-tenancy §19) holds while suites run concurrently; the cleanup hook is prefix-based so a mid-before failure can never leave a stale active tenant behind.