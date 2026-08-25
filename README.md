# Student & Counselor Education Platform

A production-ready, white-labeled education platform that connects **students**, **counselors**, **super admins**, and **university admins**. Includes a career library, college/university directory (72k+ Indian institutions from AISHE data), mock tests, scholarships, AI odds calculator, appointments, messaging, and analytics.

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Language | **TypeScript** |
| Framework | **Next.js 16** (App Router, server + client components) |
| UI | **React 19**, **Tailwind CSS 3**, **lucide-react**, **react-icons** |
| Database | **PostgreSQL** (hosted on **Neon**) via **Prisma ORM** |
| Auth | **NextAuth v4** (password-based) |
| Realtime | **Upstash Redis** (`@upstash/redis`) with in-memory fallback |
| Excel parsing | `xlsx` |
| Deployment | **Vercel** (GitHub integration + Vercel CLI) |
| Hosting URL | `https://unstoppable2o23-old-techgemini.vercel.app` |

---

## 2. How It Is Deployed

- **Repository**: GitHub `unstoppable2o23/old-techgemini`, branch `master`
- **Production alias**: `https://unstoppable2o23-old-techgemini.vercel.app`

### Deploy process

A deploy runs on every push to `master` (Vercel GitHub integration) and can also be triggered manually:

```bash
git add -A
git commit -m "your message"
git push origin master
npx vercel --prod --yes
```

### Build pipeline (`vercel-build` in `package.json`)

```text
prisma generate          → generate Prisma client
prisma db push           → sync database schema (idempotent)
node scripts/seed-careers.mjs         → import 138 careers (idempotent)
node scripts/import-institutions.mjs  → import 72,443 AISHE institutions (only when table empty)
next build               → production build
```

### Environment variables

Set these in the Vercel project settings (and locally in `.env` / `.env.local`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Must match the production domain |
| `NEXTAUTH_SECRET` | Session signing secret |
| `REDIS_URL`, `REDIS_TOKEN` | Upstash Redis for realtime chat/presence |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | Email notifications |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Google service account (sheets/drive integrations) |

---

## 3. Roles & Access

| Role | Capabilities |
|---|---|
| **SUPER_ADMIN** | Everything: manage counselors, feature flags, analytics, universities, broadcast notifications |
| **COUNSELOR** | Student management, feature flags (grant/revoke student access), universities, career library, calendar, webinars, messages, analytics |
| **STUDENT** | Home, college finder, AI odds calculator, mock tests, scholarships, career library, Indian colleges & universities, appointments, messages |
| **UNIVERSITY_ADMIN** | Dashboard + universities management |

---

## 4. Features

- **Career Library** — 138 careers (scraped from edumilestones), search, detail pages, salary/demand data, feature-flag gated per student
- **Indian Colleges & Universities** — 72,443 real institutions (53,864 colleges, 1,427 universities, 16,868 standalone, 284 R&D institutes) from AISHE Excel data; search by name/AISHE code/district, filter by state/type, pagination, CSV export (admin-only). Requires login.
- **College Finder** — global QS-ranked university search
- **AI Odds Calculator** — ranks universities by a student's test scores
- **Mock Tests & Scholarships** — student assessment hub and scholarship info
- **Appointments** — booking with payment proof upload and verification, 30-day expiry
- **Messaging** — student↔counselor chat with Redis-backed realtime + polling fallback
- **Presence** — live student/counselor online status persisted to DB
- **Notifications** — per-user notifications with unread badges
- **Multi-tenancy** — per-tenant branding (logo, brand name, colors), tenant header injection via middleware

---

## 5. Getting Started Locally

```bash
npm install
npx prisma generate
npm run dev
# → http://localhost:3000
```

### Local database

The local `.env` points to `postgresql://user:***@localhost:5432/platform` — set up a local Postgres and update `DATABASE_URL`, then run:

```bash
npx prisma db push   # create tables
node scripts/seed-super-admin.js   # create a SUPER_ADMIN account
```

### Seeding data

- `scripts/seed-careers.mjs` — careers
- `scripts/import-institutions.mjs` — AISHE institutions (reads `scripts/institutions-data.json`)
- `scripts/generate-institutions-data.mjs` — regenerate `institutions-data.json` from the `AISHE/` Excel files (local-only, folder is gitignored)
- `scripts/seed-universities.js` — QS universities

---

## 6. Project Structure

```text
src/
  app/                    # Next.js App Router
    (student)/            # student-only pages (login required)
    (counselor)/          # counselor + super admin pages
    admin/                # admin pages
    api/                  # backend API routes (Next.js route handlers)
    auth/                 # login / register / forgot-password
    dashboard/            # role dashboard
    messages/             # chat UI
    settings/             # user settings
    universities/         # QS university directory (admin)
  components/             # shared UI components
  hooks/                  # use-feature-flags, use-presence, use-notifications
  lib/                    # prisma client, auth, redis
prisma/schema.prisma      # database schema (Prisma models)
scripts/                  # data generation + import scripts
AISHE/                    # local-only source Excel files (gitignored)
```

---

## 7. Key Data Notes

- **Institutions**: `IndianInstitution` model, unique on `aisheCode`. Data imported from AISHE Excel sheets provided by the client (`AISHE/` folder): `University-ALL UNIVERSITIES.xlsx`, `College-ALL COLLEGE.xlsx`, `Standalone-ALL STANDALONE.xlsx`, `R & D Institutes.xlsx`, and the `Institute of National Importance` files.
- **Feature flags**: `StudentFeatureAccess` model gates Career Library, Mock Tests, Scholarships, College Finder, Appointments, AI Odds Calculator per student. Counselors toggle these; super admins bypass.
