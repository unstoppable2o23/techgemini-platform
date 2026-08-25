# TechGemini Career Assessment Platform

White-labeled career counselling platform with five psychometric assessments:

| Test | Questions | Output |
|---|---|---|
| Stream Selector | 76 | Stream recommendation (Humanities / Science / Commerce / Arts) |
| Ideal Career | 182 | Section scores + top strengths + career matches |
| Personality Type Profile | 36 | 4-letter personality type + narrative report |
| Multiple Intelligences | 54 | 9 intelligence scores + Emotional Intelligence |
| Learning & Productivity | 69 | 16 preference dimensions in 3 groups |

## Features
- Counselor / Super Admin assignment flow with 20-minute unassign window
- Permanent per-student test links (never expire, cross-device resume)
- Answers stored in the database; reports generated server-side
- Branded PDF report downloads (counselor/tenant logo, A4, multi-page)

## Stack
Next.js (App Router) · Prisma + PostgreSQL · NextAuth · Tailwind CSS · Vercel

## Deploy
Pushes to `master` auto-deploy to production via Vercel.
