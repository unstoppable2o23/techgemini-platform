# Phase 18 — Student Journey Map & Readiness

**Date:** 2026-09-03
**Purpose:** Document the end-to-end student journey against the launch-readiness bar, and confirm the product is coherent and sellable as a guided career + education guidance experience.

## 1. Journey overview

```
Discover (landing)
  → Create account / Sign in
  → Onboarding (career preferences wizard)
  → Dashboard (guided next step)
  → Career matches (recommendations + reasons)
  → Career detail (pathway, programs, universities, trend)
  → Education pathway (what to study)
  → University options (where to study) + shortlist/compare
  → Counselor handoff (book / message)
  → Report-style view / sample report (demo)
```

## 2. Entry (landing + auth)

- **Before Phase 18:** `/` was a bare redirect to login; there was no WHAT/WHO/WHY/HOW/NEXT surface.
- **After:** `/` is a full marketing page answering: *what* it is (career + education guidance), *who* it's for (students, parents, counselors), *why* (find suitable career/study paths), *how* (share details → get matching careers → explore programs/universities → plan), *next* (start free profile). Uses the recommended honest tagline and avoids exaggerated AI claims. A link to a **synthetic sample report** (`/demo`) lets buyers preview the output.
- **Auth:** credentials-based NextAuth (bcrypt, rate-limited, anti-enumeration). **Note:** forgot-password flow is non-functional (qualified P1) — sign-in is otherwise solid.

## 3. Onboarding

- `/career-preferences` 5-step wizard (About You → Academics → Career Interests → Education Goals → Review). New students are gated to it from the dashboard until a minimal profile exists.
- Fields cover nationality/state, study level, grades, exams, subjects, preferred career, activity interests, study-abroad intent, target countries/colleges, budget, funding, English test, intake.

## 4. Dashboard (`/dashboard`)

- Hero with assessment/coverage/saved summary; a "primary next step" call-to-action; a 7-step "Your Career Journey" stepper; career matches, education pathways, university matches, trending careers, shortlist, and next-steps list; a counselor handoff card (book/message).
- This is the strongest next-action surface and now serves as the main funnel hub.

## 5. Career matches (`/career-matches`)

- Cards show rank, name, category, demand, entry salary, match %, a strength badge (Strong / Moderate / Weak / Developing / Limited Data), a confidence %, and **reasons why** (strengths with checkmarks + development areas). Low-information and disclaimer states are handled honestly.
- **Phase 18 changes:** replaced internal "career signals" jargon with plain language, and added a **"What's next?"** funnel card linking to study pathways and booking a session, closing the results → education/counselor gap.

## 6. Career detail (`/career-library/[slug]`)

- Hero, quick stats, market outlook, eligibility, who-should-pursue, work nature, career pathways, options, FAQs, skills, **education pathways** (primary/alternative/optional + recommended subjects), institutions offering related programs, recommended universities (with "why" and verification badges), trend & outlook with an honest amber disclaimer.

## 7. Education → Program

- `Education pathways` and `Career → Program` (`AcademicProgram`, PRIMARY/COMMON/SPECIALIZED/RELEVANT/OPTIONAL) are surfaced on career detail. Programs are ordered deterministically with strength/confidence/rationale.

## 8. University surface

- University detail page shows identity, programs by degree (with Verified/Relevant/Not-yet-verified and freshness badges), "how this connects to you" student context, and "fit = how well it matches your profile, not your chance of admission." Avoids "best institution" claims.
- **Phase 18 security fix:** the personal "how this connects to you" context is now derived from the authenticated session — no other student's profile can be loaded.

## 9. Shortlist / compare / saved

- Shortlists universities/Indian institutions; compare up to 4. SaveButton used across career/university surfaces.
- **Minor (P2):** SaveButton does not reflect a pre-existing saved state on revisit; shortlist/saved pages handle their own state.

## 10. Counselor handoff (conversion)

- Book appointment (`/appointments`) + message (`/messages`) CTAs are present on the dashboard and now on the career-results page. Uses the existing appointment/contact architecture (no new payment/CRM).

## 11. Report-style output

- Per-assessment result **PDF** already exists (student-facing, html2canvas + jspdf).
- The **synthetic `/demo` report** demonstrates the 10-section structure (Student Profile → Assessment Summary → Career Strengths → Recommended Careers → Why These Careers → Areas to Develop → Recommended Programs → University Options → Suggested Next Steps → Counselor Notes/Follow-up) clearly labeled as sample data.
- A full combined counselor-report PDF is logged as an enhancement, not built (scope control).

## 12. Error / empty / loading states

- Now backed by a root `src/app/error.tsx` global boundary (was only on career-matches). Loading states handled per-page; empty states are honest and actionable. No raw stack traces exposed to students.

## 13. Mobile

- Responsive grids everywhere; a mobile bottom nav for students (Home/Discover/Assess/Saved/More) with safe-area handling. No fixed-width layouts found. The odds tool's fixed `w-28`/`w-22` gauge on very small screens is a minor cosmetic item.

## 14. Readiness verdict

The student journey is **launch-ready**: onboarding → personalized recommendations → reasons → study pathways → programs → universities → shortlist → counselor handoff all connect, with honest framing and a clear next step at each stage. The funnel gap at career-results (now closed) and the missing landing page (now built) were the two largest student-side blockers, both resolved.