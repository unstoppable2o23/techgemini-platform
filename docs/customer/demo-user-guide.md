# TechGemini — Demo Guide (for Sales)

How to use the built-in **TechGemini Demo School** to present TechGemini to prospects. This organization and all its people are **synthetic** — the emails are `@demo.techgemini.local` and every student is fake. Use it confidently in a live demonstration.

## Demo organization

- **Name:** "TechGemini Demo School"
- **Plan:** Professional (paid) — never hits trial limits in a demo
- **Org admin:** `admin@demo.techgemini.local`
- **Counselors:** `counselor1@demo.techgemini.local`, `counselor2@demo.techgemini.local`
- **Students:** `student1@demo.techgemini.local` … `student5@demo.techgemini.local`
- **Sign-in password (all accounts):** `DemoPass2026!`

The demo students each explore a different direction — Data Science, Architecture, Medicine, Product Design, and Clinical Psychology — so you can pick the one closest to a prospect's needs.

## Signing in

All demo accounts share the password above. Sign in as the org admin to show the **Admin dashboard** (overview, students, counselors, billing/plan), or as a counselor to show the **student 360 view** with recommended careers, study pathways, universities and follow-up notes.

## What to show (short)

1. **Org admin — overview:** number of counselors and students, usage, and plan.
2. **Counselor → a student's 360 view:** recommended career paths with reasons, study pathways, and university options.
3. **Student profile:** their interests, subjects and assessment answers that drive the recommendations.

## Framing (important)

- Say recommendations are **directional guidance** that prioritizes what to explore — "strong alignment" and "recommended career paths" — **not** guaranteed outcomes. Do not claim a guaranteed career, prediction, admission, or salary, and don't claim "100% accuracy."
- Customer counselors should receive the statements as a basis for discussion with the student and family.

## Re-seeding

If the demo organization is ever deleted or needs to be rebuilt, run:

```
node scripts/seed-phase19-demo-org.js
```

It is idempotent: re-running safely tops up existing demo records (profiles and career signals) without duplicating.

## Honesty

Every profile in the demo is synthetic. Never put a real person's data in the demo organization.