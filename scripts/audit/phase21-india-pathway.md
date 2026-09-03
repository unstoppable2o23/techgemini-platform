# Phase 21 — India Pathway Audit

## Design principles (India)
For an India destination the roadmap builds around the recognized Indian
merit-exam + admission calendar while staying conservative:

- **Stream / subject choice** is framed as `RECOMMENDED` exploration based on the
  student's preferred career and subjects, never forced.
- **Board exams** appear with `REQUIRED` framing only when the student's evidence
  (gradeLevel + preferredCareer) indicates a board-contingent path; otherwise
  `CHECK`.
- **Entrance exams** (JEE / NEET / CUET and equivalents) are shown only with
  reliability phrasing — `REQUIRED` if the target program demonstrably requires
  them, otherwise `MAY_APPLY` or `CHECK`. The engine never asserts a specific
  JEE/NEET score or percentile.
- **Shortlist** lists 5–7 Indian institutions from the frozen `University` /
  `IndianInstitution` catalog via `getUniversityMatchesForStudent`, framed as
  "shortlist to research" not "admission guaranteed".
- **Application window** and **fees** are never invented; the step says "check
  the official admission portal" with `CHECK` phrasing.
- **Scholarship / loan** steps are `CHECK`-only ("research whether you qualify").

## Non-fabrication guarantees (India)
- No fabricated exam cut-off, percentile, or deadline.
- No guaranteed admission, scholarship, or seat.
- Exams present only when the career axis provides evidence.

## Covered in tests
- `India entrance-exam planning is evidence framed, never fabricated` —
  verifies no fabricated JEE/NEET assertion for a Class 12 science student.
- Class 10 students never receive PG or entrance-misstage steps.
- Golden `class10_science` profile: exploration-first roadmap with no
  postgraduate content.
