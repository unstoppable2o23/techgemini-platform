# Phase 23.2 — Medical Roadmap Audit

**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1

---

## 1. Branch model (B11)

The Study Roadmap branches on the actual target career from the medical-education registry —
not a single MBBS template. Three distinct plans:

- **MEDICINE / DENTISTRY:** Class 10 → Class 11–12 science (P/C/B) → NEET-UG where it applies →
  MBBS/BDS → internship/training → council registration → PG entrance → specialization.
- **NURSING:** Class 10 → relevant subjects → nursing program → clinical/practical training →
  INC registration where applicable → employment / higher study.
- **PHARMACY / allied-health / etc.:** Class 10 → relevant subjects → discipline program →
  training → registration where a council exists → employment / higher study (generic
  conservative wording; no medical branch).

`isMedicalCareerName()` gates the medical branch to Medicine/Dentistry/Nursing only; allied-health
(e.g. Physiotherapy) and tech-adjacent healthcare careers keep generic wording (tests M14, M5, M6).

## 2. India vs abroad (B12/B13)

- India: NEET-UG attributed to NTA with its notified scope (MBBS/BDS + AYUSH + some B.Sc-Nursing);
  never "all healthcare needs NEET"; never "must/required" phrasing (M8, M9). Councils named only
  where they exist (NMC, DCI, INC, PCI, NCISM/NCH).
- Abroad (USA/UK/Canada/Australia/Germany/Ireland/NZ surfaced only where reliable info exists):
  admission, recognition, language, licensing and institution-specific checks; foreign degrees
  never imply automatic practice either direction (M10, L).

## 3. Wording guarantees

- No fabricated fees, cutoffs, seats, rankings, deadlines, scholarships or visa outcomes (B16) —
  always "check official current information".
- No "Polytechnic/Diploma is inferior" or economic/ability assumptions (A9); neutral framing.
- Lateral entry is conditional ("subject to the applicable state and institution rules and is
  not automatic") (A8, M-tests, golden C).
- Deterministic (M13, golden determinism test).

## 4. Sequencing validation (golden A–D, E–L)

All 14 golden profile cases pass (`tests/phase23-2-golden-profiles.test.mjs`): diploma vs degree
tracks, medical vs nursing vs pharmacy vs research paths, and abroad handling.