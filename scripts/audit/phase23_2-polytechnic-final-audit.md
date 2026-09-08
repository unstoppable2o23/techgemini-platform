# Phase 23.2 — Polytechnic Final Audit

**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1

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

## 3. Corrections verified

1. Degree-only B.E./B.Tech category discovery is never polytechnic (G3).
2. M.TECH Environmental Engineering yields an honest empty (G4) — no polytechnic leak.
3. `getSingleCandidate` — polytechnic and `(Diploma)` institutions never category-match a
   degree-only query (G5, G6).
4. Diploma-context queries still map to polytechnic institutions — tracks stay disjoint (G7).
5. No verified Program row at a diploma-level institution (G8).
6. Degree-only engineering discovery is deterministic (G10).

## 4. Confirmation

**Diploma-only institutions are no longer treated as 4-year engineering degree institutions.**
Institution name/type alone is never used to infer a degree (A3, A5 honoured). The only basis
on which an institution grants a degree is an independently verified Program row or an explicit
curated education-institution mapping.

## 5. Remaining limitation

Per-institution "diploma-only vs degree-granting" within the single `Technical/Polytechnic`
AISHE type cannot be split at query level. Mitigated by 0 program rows at diplomas, neutral
labels, and the honest not-found disclaimer — never by fabrication.