# Phase 21 — Student University Comparison + Shortlist: Final Report

## Status
COMPLETE — Phase 21 is the final phase of the roadmap (Phases 16–21). Matching engine, fit tiers, and profile logic remain **FROZEN** (zero changes to `engine.ts`, `fit-tier.ts`, `profile.ts`, `freshness.ts`, or the `University` / `IndianInstitution` / `Program` schema). Phase 21 is feature/UI only.

## What shipped

### Student shortlist (student-owned, additive)
- New API `POST /api/student/shortlist` — add item (`UNIVERSITY` or `INDIAN_INSTITUTION`), enforces limit of **20**, validates the referenced institution exists (read-only check), idempotent via `@@unique([studentId, itemType, itemId])` (add returns existing item, `201` only on first create).
- New API `GET /api/student/shortlist` — returns shortlist enriched with the shared read-only **university profile view** (`getUniversityProfile`), newest first, capped at 20. If a profile fails, the item is still returned with `profile: null` (no fabrication).
- New API `DELETE /api/student/shortlist` — item-based removal (body `{ itemType, itemId }`), ownership enforced.
- New API `DELETE /api/student/shortlist/[id]` — id-based removal, ownership enforced (counselor never deletes student rows).
- Counselor read-only view: `GET /api/counselor/students/[id]/shortlist` — same data as student (no fork), gated by `loadAuthorizedStudent`.

### Comparison (server-side, side-by-side, no ranking)
- Shared lib `src/lib/student/comparison.ts` exposes `buildComparison(profiles)` + documented fixed `COMPARISON_ROWS` (name, location, dataset, type, programs, verification, freshness, match score, confidence, why-recommended, website, QS rank).
- `POST /api/student/compare` and `POST /api/counselor/students/[id]/compare` call `getUniversityProfile` per id **server-side** (the browser never stitches N profile calls) and assemble the table with `buildComparison`.
- Max **4** institutions (rejected with `400` above the limit).
- Every missing value renders the literal string **"Not available"** — never blank, never a dash.
- Mixed evidence is explicit: each row/cell independent (verified program vs "Relevant institution").
- No aggregate winner, no overall score, no implicit rank; row order is fixed and **documented** in the response (`rowOrder`).
- Persistent clarifier: "Fit describes how well this matches your profile — not your chance of admission."
- Failed profile loads are skipped, never fabricated.

### UI entry points + views
- `/shortlist` (student): list with badges (verified/Relevant institution, freshness), remove buttons, "Compare selected" (first 4), link to profile page.
- `/compare` (student): side-by-side table, collapsible all-unavailable rows, badges for verification and freshness, fixed-row disclaimer, accepts `?ids=a,b,c,d&dataset=…&careerId=…`.
- Profile page `src/app/universities/[id]/page.tsx`: "Save to shortlist" toggle (reflects current shortlist state) + "Compare" link.
- Match results (`career-library/[slug]/career-detail-client.tsx`): per-card "Save"/"Saved" shortlist toggle.
- Nav (`src/components/layout/nav-config.ts`): "My Shortlist" and "Compare" added to the student Plan group.

## Safety confirmations
- `StudentShortlist` is student-owned (indexed by `studentId`); `University` / `IndianInstitution` / `Program` records are **read-only** — the shortlist references institutions without writing institution data.
- Comparison only uses fields already present in the profile read view; anything else is "Not available".
- No admission claim, no chance-of-admission language, no ranking superiority/"winner" anywhere.
- Engine + fit-tier + profile layers were **not** modified (verified: no diff to those files).

## Verification
- Tests: `tests/shortlist-comparison.test.mjs` adds 15 scenarios (itemType validation, unique/dedup semantics, compare max 4, "Not available" never blank, honest verification badge, fixed documented row order, no winner row, request-order preservation, clarifier presence, reasons fallback, score/confidence render, dataset India vs Intl, model shape, limit 20, failed-profile skip). Full suite: **245 pass / 0 fail** (was 230).
- `tests/navigation.test.mjs` updated to register `/shortlist` and `/compare` as real routes.
- `npm run typecheck` — clean. `npm run build` — succeeds, `/shortlist` and `/compare` registered.
- Prisma: `db push` confirmed schema already in sync (`StudentShortlist` table exists) — no migration of institution data.

## Files added
- `src/app/api/student/shortlist/route.ts`, `src/app/api/student/shortlist/[id]/route.ts`
- `src/app/api/student/compare/route.ts`
- `src/app/api/counselor/students/[id]/shortlist/route.ts`, `src/app/api/counselor/students/[id]/compare/route.ts`
- `src/lib/student/comparison.ts`
- `src/app/(student)/shortlist/page.tsx`, `src/app/(student)/compare/page.tsx`
- `tests/shortlist-comparison.test.mjs`

## Files edited (UI/nav only)
- `src/app/universities/[id]/page.tsx` (shortlist toggle + compare link)
- `src/app/(student)/career-library/[slug]/career-detail-client.tsx` (save buttons on match results)
- `src/components/layout/nav-config.ts` (nav links)
- `tests/navigation.test.mjs` (register new routes)

## Roadmap complete
Phases 13–21 are committed and pushed. Phase 21 closes the roadmap: career matching → university intelligence → shortlist + comparison.