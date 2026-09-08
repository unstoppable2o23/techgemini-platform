# Phase 23.2 — Medical Education Intelligence (Part B)

**Phase:** 23.2 — Polytechnic correction and medical education intelligence v1

---

## 1. Knowledge layer

`src/lib/medical-education/registry.ts` defines the medical-education registry: **21
disciplines**, one for every distinct education stream in the active Healthcare & Medicine
career set.

| Discipline | Regulated UG entrance | Source |
|------------|----------------------|--------|
| Medicine (MBBS) | Yes (NEET-UG) | NMC, NTA |
| Dentistry (BDS) | Yes (NEET-UG) | Dental Council of India |
| AYUSH | No (state-level) | NCH, NCISM |
| Nursing | Yes (NEET-UG for B.Sc Nursing) | Indian Nursing Council, NTA |
| Pharmacy | No | Pharmacy Council of India |
| Physiotherapy | No | AHP NEC (NCAHP) |
| Occupational Therapy | No | AHP NEC (NCAHP) |
| Optometry | No | AHP NEC (NCAHP) |
| Audiology & Speech-Language Pathology | No | AHP NEC (NCAHP) |
| Diagnostics & Medical Laboratory Sciences | No | various (see registry) |
| Respiratory Care | No | AHP NEC (NCAHP) |
| Paramedic & Emergency Care | No | AHP NEC (NCAHP) |
| Rehabilitation, Prosthetics & Podiatry | No | AHP NEC (NCAHP) |
| Public Health | No (no central statutory register) | none cited (honest) |
| Clinical Research | No (no central statutory register) | none cited (honest) |
| Health IT & Digital Health | No (no central statutory register) | none cited (honest) |
| Hospital Management | No (no central statutory register) | none cited (honest) |
| Nutrition & Dietetics | No (no central statutory register) | none cited (honest) |
| Genetics & Genetic Counseling | No (no central statutory register) | none cited (honest) |
| Veterinary Science | No (separate VCI domain) | VCI, ICAR, NCERT |
| Biomedical Science | No (no central statutory register) | none cited (honest) |

- **Coverage:** 34/34 active Healthcare & Medicine careers resolve to a discipline
  (uncovered: none).
- **`regulatedEntrance`** is `true` only for medicine, dentistry and nursing — the exact set
  of disciplines with a notified national UG entrance exam.
- **Source honesty contract (test M3):** every discipline either cites an official source for
  its regulator, or explicitly states there is no central statutory register. Disciplines with
  `sources: []` must carry that explicit no-regulator wording — nothing is fabricated and no
  professional body is invented.

## 2. Roadmap branch

`src/lib/roadmap/rules.ts` gains a `medicalEducationPath` branch driven by the registry.

- Triggered for MBBS/BDS-style goals (medicine, dentistry, nursing) where the discipline has
  a regulated UG entrance; allied-health goals (e.g. physiotherapy) keep generic wording
  (test M14).
- India vs abroad paths are distinct (tests M8/M10); NEET-UG is attributed to NTA and scoped
  conservatively, never worded "must/required" (tests M7–M10).
- No postgraduate or exam-must phrasing at Class-10 stage; UG branch includes internship and
  PG-entrance planning steps; PG branch includes registration/licensing (tests M7, M11, M12).
- Deterministic (test M13) and free of fabricated costs/fees/cutoffs/deadlines.

## 3. Where it surfaces

- `src/app/(student)/career-library/[slug]/page.tsx` + `career-detail-client.tsx` —
  MEDICAL EDUCATION PATH section.
- `src/app/(counselor)/students/[id]/student-360-client.tsx` — education tab panel
  (entrance / degree / internship / registration rows, alternatives, sources, conservative
  wording note).
- `src/lib/counselor/student360.ts` — `educationPathways.medicalEducationPath` data.

## 4. Evidence

`scripts/audit/phase23_2-medical-audit.json` + `tests/phase23-2-medical.test.mjs` (M1–M23).