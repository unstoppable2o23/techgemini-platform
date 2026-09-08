# Phase 23.2 — Medical Roadmap Verification (Part B)

**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1

---

## 1. Constraint set (inherited from Phases 6 / 21)

- Class-10 stage: no `/(postgraduate|masters|ph\.?d)/i`, no exam-wrapped "must/required".
- India Class-12: NEET-UG must be attributed to NTA and scoped to its notified scope
  (MBBS/BDS + AYUSH + some B.Sc Nursing); never `(JEE|NEET|CUET|CAT)...(must|required)`.
- No fabricated fees, cutoffs, seats, rankings or deadline dates anywhere.
- Roadmap must stay deterministic and branch only on real user inputs.

## 2. Medical branch rules (as implemented)

| Step | Discipline scope | Guarantee |
|------|------------------|-----------|
| Class-10 | medicine/dentistry/nursing | no PG mention, no exam-must |
| Class-12 (India, medicine) | MBBS/BDS/AYUSH | NEET-UG via NTA, conservative, "notified scope" |
| Class-12 (India, nursing) | nursing | no NEET-for-nursing assertion |
| Class-12 (abroad) | medicine | no NEET, institution/deadline-safe, generic "official deadlines" |
| UG | medicine/dentistry | internship + PG-entrance planning steps |
| PG | medicine/dentistry | registration/licensing step |
| Allied health (physiotherapy, etc.) | none | generic wording, NO medical branch |

## 3. Regression tests (M7–M15)

- M7 Class-10 no-PG/no-exam-must — PASS
- M8 India Class-12 NEET conservative — PASS
- M9 nursing no NEET-UG assertion — PASS
- M10 abroad no-NEET, conservative — PASS
- M11 UG internship + PG-entrance steps — PASS
- M12 PG registration/licensing step — PASS
- M13 deterministic across two runs — PASS
- M14 physiotherapy gets no medical branch — PASS
- M15 non-health goal never mentions NEET in India Class-12 — PASS

## 4. Evidence

- `tests/phase23-2-medical.test.mjs`
- Roadmap output spot-checked in `scripts/audit/phase23_2-medical-audit.json`.