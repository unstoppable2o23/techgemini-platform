# Phase 23.2 — Medical Career Audit

**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1

---

## 1. Inventory (34 active Healthcare & Medicine careers)

All 34 below are present, active, have FAQs and Career→Program mappings, and **no duplicates**:

Medicine, Dentistry, Nursing, Pharmacology, Veterinary Science, Physiotherapy, Occupational
Therapy, Optometry, Audiology, Speech-Language Pathology, Medical Laboratory Sciences, Radiology
Technology, Sonographer, Paramedic, Phlebotomist, Respiratory Therapist, Podiatrist, Prosthetist
& Orthotist, Chiropractor, Public Health, Epidemiologist, Health Educator, Nutrition and
Dietetics, Genetic Counseling, Clinical Research, Clinical Data Management, Health Informatics,
Hospital Administration, Medical Coding, Medical AI Engineer, Pharmacovigilance, Regulatory
Affairs, Telehealth Specialist, Surgeon.

Coverage: AYUSH-type content is represented within the Medicine/Dentistry/regulatory registry
disciplines (AYUSH discipline, state-level admissions); biomedical/biotechnology research careers
map to the biomedical discipline; healthcare management → hospital-management; clinical research
→ clinical-research; public health → public-health. **No new careers were added** — the existing
catalog already covers the full B1 list; nothing was duplicated.

## 2. Registry linkage (34/34)

Every active Healthcare & Medicine career resolves to a `medical-education` registry discipline
(21 total). Zero uncovered careers (validated by test M2).

## 3. Critical distinction (B3/B5)

The medical branch and NEET-UG wording are applied **only** to careers with a regulated UG
entrance (Medicine, Dentistry, Nursing). Pharmacy, allied-health, biomedical, biotech, public
health, medical research etc. keep non-NEET, discipline-appropriate wording (tests M5, M6, M14,
G/G/I/J). A Biology student is never forced down Medicine→MBBS; the engine and content surface
the full healthcare breadth.

## 4. Sources

Official regulators only (see `phase23_2-source-verification.md`). One discipline is represented
in the catalog as `Surgeon` (specialization of Medicine) — it resolves to the medicine discipline
via registry aliases; no duplicate MBBS career exists.

## 5. Last reviewed date (final pass)

Every discipline entry in `src/lib/medical-education/registry.ts` now carries
`lastReviewed` (= `MEDICAL_EDUCATION_LAST_REVIEWED`, `2026-09-08`). `student360.ts` propagates
it into `medicalEducationPath.lastReviewed`, and the counselor Medical Education Path panel
renders "Last reviewed:" via `<time dateTime>`. The knowledge base is never presented as
timeless. Machine-readable flag: `phase23_2-medical-audit.json` → `lastReviewed`.