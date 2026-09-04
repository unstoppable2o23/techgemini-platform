# TechGemini — Pilot Onboarding Script

Use this script when taking a **pilot customer** (school, college, counselor, or education consultancy) from first demo to first live cohort. Frame all recommendations as **directional guidance**, never guaranteed outcomes.

## Step 0 — Pre-call checklist

- [ ] Confirm the pilot agreement: number of students, number of counselors, pilot duration, and success criteria.
- [ ] Confirm the customer's org admin (name + email) and the plan type (trial 14-day, or paid Professional).
- [ ] Confirm the pilot cohort scope: which class/grade, single batch or whole institute.

## Step 1 — Provision the organization (we do this)

- [ ] Create the organization (via `/api/commercial/trial` for trial, or a `TRIAL`/`PROFESSIONAL` tenant for paid).
- [ ] Set the plan so entitlement limits and features match the agreement.
- [ ] Create and share the **Organization Admin** account with the customer's admin.
- [ ] Verify the admin can sign in and see the **Admin dashboard** + **Setup** banner.

Talking point: *"Your TechGemini space is ready. You own it — you can add counselors and students and manage billing yourself."*

## Step 2 — Admin setup (guided, 5 steps)

Walk the admin through the **setup wizard**:

1. **Organization** — confirm name, colors, logo.
2. **Counselors** — enter the counselors who will guide students.
3. **Students** — add the pilot cohort.
4. **Configure** — ready change to inviting students.
5. **Launch** — mark ready.

Talking point: *"This wizard takes you from an empty account to a live cohort step by step — you can pause and resume anytime."*

## Step 3 — Add the cohort

Offer both paths:

- **CSV import** (recommended): the admin uploads a CSV with firstName, lastName, email, phone, gradeLevel, counselor. We validate every row and report clear errors.
- **Manual add**: the admin or a counselor enters each student.

Talking point: *"If you already have student data, upload it and we'll tell you exactly which rows need fixing — no silent failures."*

## Step 4 — Invite students

- Walk through inviting students so each sets their **own password** via a secure 7-day invitation link.
- Emphasize: **no passwords are ever emailed to students.**

Talking point: *"Students click the link and choose their own password. Nothing is sent insecurely, and you can see who has and hasn't accepted."*

## Step 5 — First use (soft launch)

- [ ] Run one student end-to-end: profile → recommended careers → study pathways → universities → counselor session.
- [ ] Confirm a counselor opens the student **360 view** and sees recommendations with reasons.
- [ ] Confirm booking a session + follow-up notes works.
- [ ] Check the admin **Overview** pilot metrics (career results, roadmaps, follow-ups, invitations).

Talking point: *"Let's do one real student together so you see the full journey before we roll out the whole cohort."*

## Step 6 — Support & handover

- [ ] Hand over `docs/customer/org-admin-guide.md`, `counselor-guide.md`, `student-guide.md`.
- [ ] Confirm the **Help & Support** flow works from the user menu.
- [ ] Confirm password reset works for all roles.

Talking point: *"You use the in-app support from the menu anytime. Questions, problems, and contact requests are tracked under your organization."*

## Step 7 — Pilot review (post-launch)

- [ ] Revisit the pilot success criteria agreed in Step 0.
- [ ] Review pilot metrics with the customer.
- [ ] Decide together: continue to a broader rollout / paid plan, or adjust scope.

## Guardrails

- Never guarantee a career or admission outcome — always "directional guidance".
- Never send student passwords by email; use the invitation link.
- Respect the plan's student and counselor limits.
