# Phase 18 — Counselor Journey Map & Readiness

**Date:** 2026-09-03
**Purpose:** Document the counselor experience against the launch-readiness bar and confirm the product supports effective student guidance and follow-up.

## 1. Journey overview

```
Counselor dashboard
  → Student list (assigned students, search, status, assessment/profile/career columns)
  → Student 360 (7-tab view)
  → Overview / Assessments / Career Intelligence / Education / Universities / Notes / Actions
  → Follow-up: notes + actions + appointments + chats + recommendation feedback
```

## 2. Student list (`/counselor/students`)

- Columns: student (name/email), status (Online/In Test/Offline), last seen, usage time, **assessment completion** (`x/5`), profile completeness %, preferred career, account active toggle, and 10 feature-flag toggles.
- Actions: search by name/email, filter by status, view profile (with edit), reset password, open 360 view. Auto-refresh every 15s.
- **Authorization:** requires `COUNSELOR` or `SUPER_ADMIN`. Regular counselors are scoped to **their assigned students only**; SUPER_ADMIN sees all students in the tenant.

## 3. Student 360 (`/counselor/students/[id]`)

Data assembled by `getStudent360` (user, profile, assessments, career profile, career matches, education pathways, university matches, notes, actions, feedback, appointments, chats) and rendered across 7 tabs:

1. **Overview** – student profile, appointments, communication/chat.
2. **Assessments** – per-kind completion status (report detail opens in the student's assessment area).
3. **Career Intelligence** – career matches with match/confidence %, top strengths, development areas, plus a **counselor feedback** decision per career (SUITABLE / UNSUITABLE / STUDENT_INTERESTED / STUDENT_NOT_INTERESTED / DISCUSS_FURTHER + note).
4. **Education** – education pathways (primary/alternative/optional) + recommended subjects from the top career.
5. **Universities** – matched institutions with match/confidence %, mapping badge, website, limitations warning, and per-university **counselor feedback**.
6. **Notes** – typed counselor notes (GENERAL / CAREER / EDUCATION / UNIVERSITY / FOLLOW_UP).
7. **Actions** – follow-up actions with title, description, due date, type, and completion toggles.

A summary bar shows profile %, assessment count, education level, university count, top career, and a "follow-up required" flag derived from incomplete actions.

## 4. Data exposure & honesty

- No raw JSON/trace exposure in the 360 view; fields are rendered as formatted human-readable UI. `studentContext` (personalized university fit) is only present for the correct authorized student (Phase 18 fix).
- **Program recommendations (Career → Program)** exist via `src/lib/career-program.ts` and the student-facing API, but are **not yet surfaced** on the counselor 360 education tab (currently shows degree/specialization education pathways). Logged as an enhancement; not a blocker because counselors still see education pathways and can open the student's own experience.

## 5. Follow-up / notes / actions

- **Notes and actions are fully functional** (DB models, guarded APIs, UI). Appointments and chats are surfaced. Recommendation feedback can be recorded per career/university — this feeds future counselor-in-the-loop improvement.

## 6. Authorization model (strong)

- Central `loadAuthorizedStudent(id, session)` enforces: authentication → role (COUNSELOR/SUPER_ADMIN) → assignment (counselor owns the student) → tenant match. Verified across `students/[id]` profile, notes, actions, features, status, password, career-profile, career-matches, university-profile, university-matches, shortlist, compare, and recommendation-feedback routes.
- Generated-passwords for counselor-created students use **min 6** vs public min 8 — logged as a P2 policy alignment item.

## 7. Gaps logged (not blockers)

- No **combined 10-section student report/PDF** export for counselors (only the assessment-result PDF exists for students). Recommended enhancement using the existing `html2canvas`/`jspdf` capability.
- No automated "next recommended counseling action" (counselors infer next steps from the Actions/Notes tabs).
- Career → Program recommendations not yet displayed in the 360 Education tab.

## 8. Readiness verdict

The counselor journey is **launch-ready**: a rich, authorized Student 360 with notes, actions, feedback, appointments, and chats supports real guidance and follow-up. The strongest launch blocker (data-isolation on the personalized match surfaces) is resolved, and the remaining gaps are enhancements rather than blockers for a Phase 18 V1 launch.