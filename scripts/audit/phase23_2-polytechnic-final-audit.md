# Phase 23.2 — Polytechnic Final Audit

**Phase:** 23.2 — final polytechnic pathway hardening and medical education intelligence v1

---

## 1. Before / after

| Entity | Before | After | Δ |
|--------|--------|-------|---|
| IndianInstitution | 73,969 | 73,969 | 0 |
| University | 20 | 20 | 0 |
| Program | 75 | 80 | +5 (verified MBBS) |
| Career (active) | 289 | 289 | 0 |

## 2. Affected institutions / programs

- **Institutions:** 5,337 `Technical/Polytechnic` AISHE rows are now categorically treated as
  diploma-serving in degree-only contexts. These rows are **not modified**; correction is at
  classification/mapping level only.
- **Programs:** no Program rows are attached to any diploma-level institution (0 such rows);
  none fabricated. Polytechnic degrees continue to map to programs at the **Diploma**
  qualification level where the degree catalog defines them (postgraduate diplomas only;
  no technical Diploma-in-Engineering degree rows exist in the catalog).

## 3. Classification counts (machine-readable: `phase23_2-polytechnic-audit.json` `classification`)

| Metric | Count |
|--------|-------|
| Total institutions evaluated | 73,969 |
| Diploma-compatible | 14,213 |
| — Technical/Polytechnic | 5,337 |
| — Nursing (Diploma) Institute | 4,821 |
| — Teacher Training (Diploma) Institute | 3,913 |
| — Ayurvedic Nursing (Diploma) Institution | 142 |
| Degree-compatible | 58,329 |
| Ambiguous (missing type) | 1,427 |
| False-positive classifications | 0 |
| False-negative classifications | 0 |
| VERIFIED Programs at diploma-level institutions | 0 |

Qualification Level / Education Type is driven **only** by structured `institutionType`;
institution **names** never participate. Missing type data → `unknown` (conservative). A
diploma-level institution is degree-compatible only with verified-program/curated proof
(multi-level case).

## 4. Corrections verified (final pass)

1. Degree-only B.E./B.Tech category discovery is never polytechnic (G3, polytechnic-final 2–3).
2. M.TECH Environmental Engineering yields an honest empty (G4) — no polytechnic leak.
3. `getSingleCandidate` — polytechnic and `(Diploma)` institutions never category-match a
   degree-only query (G5, G6).
4. Diploma-context queries still map to polytechnic institutions — tracks stay disjoint (G7).
5. No verified Program row at a diploma-level institution (G8).
6. Degree-only engineering discovery is deterministic (G10).
7. New helper suite `tests/phase23-2-polytechnic-final.test.mjs` (13/13): helper semantics,
   name-agnostic classification, proof-gated multi-level compatibility, and the 9-point
   routing safety suite (diploma→polytechnic; degree institutions via verified tier; multi-level
   separation; no name-substring false positives; conditional progression; conservative
   missing data).

## 5. Confirmation

**Diploma-only institutions are no longer treated as 4-year engineering degree institutions.**
Institution name/type alone is never used to infer a degree (A3, A5 honoured). The only basis
on which an institution grants a degree is an independently verified Program row or an explicit
curated education-institution mapping.

## 6. Remaining limitation

Per-institution "diploma-only vs degree-granting" within the single `Technical/Polytechnic`
AISHE type cannot be split at query level. Mitigated by 0 program rows at diplomas, neutral
labels, and the honest not-found disclaimer — never by fabrication.