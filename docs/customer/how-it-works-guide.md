# SUHAIL — How It Works (Guide for Clients)

A clear walkthrough of how a school, institute, or counselor uses SUHAIL to bring students on board, guide them, and support their career decisions. Use this to understand the product, run a demo, and present it to prospective clients.

---

## 1. Who is involved (the three roles)

| Role | Who it is | What they can do |
|------|-----------|------------------|
| **Organization Admin** | The school / institute / counseling business owner | Creates the org, adds students (one-by-one or via CSV), sends student invitations, assigns counselors, views billing |
| **Counselor** | The career counselor / mentor | Assigns career tests to students, reviews and edits each student's roadmap, adds their own steps |
| **Student** | The student / family | Sets up their own login, takes recommended tests, views their career matches and roadmap, checks progress |

> **Tip for the demo:** Everyone starts with sign-in at the login page. The org admin signs in first, then brings students in.

---

## 2. Setting up the organization (Org Admin)

A new organization starts with a trial.

1. On the website, the org admin clicks **"Start Trial" / "Get started"**.
2. They fill in:
   - Organization name
   - Contact name, email, and phone
   - Their own first name, last name, email, and password
3. An account is created with role **Org Admin** and a **14-day free trial**.
4. The admin immediately signs in at the login page with the email and password they just chose.

> No email confirmation needed — the admin sets their own password at sign-up and can log in right away.

---

## 3. Adding students (Org Admin)

The org admin has a **Students** screen inside their dashboard. There are two ways to add students.

### Option A — One student at a time (per student invite)
The admin can add a student and generate a personal invitation link for them.

### Option B — Bulk import from a CSV file
1. Click **"Import CSV"**.
2. Download the **sample CSV** template to see the required format.
3. Fill in the students (first name, last name, email — and optionally phone, grade, and counselor email).
4. Upload the file. The system checks for mistakes, duplicate emails, and that you're within your plan's student limit.
5. Valid students are created instantly (up to 1,000 rows at a time).

> Imported students are created **active but with no password yet** — that's intentional. They get access by accepting their invitation (next step).

---

## 4. Giving students access (the invitation)

Students do **not** get a password handed to them. Instead, the org admin generates a secure invitation link and the student sets their own password.

1. From the Students screen, the admin clicks **"Invite"** next to a student.
2. A unique link is generated, e.g. `https://technology-platform.vercel.app/invite/abc123...`.
3. The admin copies the link and sends it to the student **through their own channel** (WhatsApp, email, phone, etc.). The platform does not send emails automatically.
4. The student opens the link — they're greeted by name — and sets their own password.
5. Their account is now ready. They sign in with their **email + the password they created**.

> **Important:** Invitation links expire after **7 days**. If it expires, the admin simply clicks "Invite" again to make a fresh one. Emails are never part of the link itself — only the database knows the student's email.

> ☝️ **Alternative:** Some schools choose **self-registration**. If enabled, students can sign up on their own at the register page (name, email, password), then log in immediately. The invitation method is the recommended one for controlled access.

---

## 5. Assigning a counselor to a student

From the Students screen, the admin assigns a counselor to each student using the counselor dropdown on the student's row. Once assigned, that counselor can manage the student's tests and roadmap.

---

## 6. Assigning career tests (Counselor)

Counselors assign **career assessments (tests)** to students. Students cannot assign tests to themselves.

1. The counselor opens the **Assign Test** screen (`/tests/assign`).
2. They pick a **student** and a **test type**:

| Test | What it reveals |
|------|-----------------|
| **Stream Selector** | Which stream (e.g. Science / Commerce / Arts) suits them |
| **Ideal Career** | Careers that fit their interests and strengths |
| **Personality Type** | MBTI-style profile (e.g. INTJ) and how they think |
| **Multiple Intelligences** | Their strongest learning/thinking styles |
| **Learning & Productivity** | How they learn and work best |

3. They click **"Generate assignment"**.
4. A **permanent test link** is created — the counselor copies it and shares it with the student. (One link per test type per student.)
5. The student opens the link and takes the test. It can be answered in one sitting or in parts — progress is saved automatically, so the student can continue later.

> ☝️ **Dedicated to clients:** Tests are not "leaked" as fixed tests; they are personalized links tied to each student's name. The counselor sees who has and hasn't started.

---

## 7. The report (after a test is finished)

When a student finishes a test:

1. The answer is validated against the real question bank (not trusted from the browser).
2. A **report is generated automatically** — scores, strengths, and (for personality) a type code with descriptions.
3. The student sees a clear visual report with bars and explanations.
4. A branded **PDF** can be downloaded (with the organization logo, student name, counselor name, and date) to share with parents or keep on file.
5. The student can **retake** the test — a fresh session is created and the previous result is kept.

> Completing assessments makes the **career matches** richer. Since career recommendations are built from the signals assessment results feed in, the more tests a student completes, the more personalised their recommendations become.

---

## 8. The career roadmap (Student ↔ Counselor)

### What the student sees
The **Roadmap** screen (`/roadmap`) turns the student's situation and test results into a step-by-step plan:

- A header showing their **Career Goal**, education stage (India vs Abroad), and a **progress percentage**.
- Steps grouped into milestones: **NOW, Next 3 Months, Next 6–12 Months, Target**.
- Each step has a title, priority (High/Medium/Low), and a description.
- A **"Try India / Try Abroad"** toggle to regenerate the plan for a different destination.
- Steps marked with a purple "Counselor" badge were added personally by the counselor.
- A "Next action" summary highlights the first thing to do right now.

### What the student can do
- Mark steps **complete**, **skip** steps, or tap **"Why"** to see the reasoning behind a step.

### What the counselor can do
From their student view, the counselor can:
- **Regenerate** the roadmap's future steps (optionally switching destination or career).
- **Add their own steps** with a personal note — these survive future regenerations and appear with a counselor badge.
- **Update** any step's status.

> ☝️ **Key behavior:** Completed steps and counselor-added steps are always **preserved** — regenerating the roadmap for a new destination never wipes out what's already been done.

---

## 9. Student's day-to-day

Once a student has an account and has taken at least one test, they can:

- View **Career Matches** — a ranked list of careers fitted to their profile.
- Open their **Roadmap** and track progress.
- Check their **Assessments** screen to start assigned tests or view past reports.
- Book appointments, compare careers/universities, explore colleges and scholarships, and message their counselor.

---

## 10. Quick-run demo script (3 minutes)

1. Sign in as the **Org Admin**.
2. Open **Students** — show the list and the **Import CSV** / **Invite** buttons.
3. Generate an **invite link** for a student and explain it expires in 7 days.
4. Switch to a **Counselor** account.
5. Open **Assign Test**, pick a student and the **Stream Selector**, generate the link.
6. Open the **Roadmap** for a student — show the milestones, the India/Abroad toggle, and the counselor "add a step".
7. Explain that as tests are completed, career matches get richer.

---

## Appendix — The access/token model at a glance

| Link type | Purpose | Expires | Notes |
|-----------|---------|---------|-------|
| **Invitation link** | Student sets their own password | 7 days | Single-use; replaced if expired |
| **Test link** | Student opens & takes a test | Never | Re-opening shows the current result if already finished |

> **Trust & control:** Student data is isolated per organization. Counselors only see students assigned to them. Tests are always counselor-assigned — students can't self-assign. All pricing/subscription limits are enforced per organization.
