# Phase 23.2 — Polytechnic Root Cause

**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1

---

## 1. The reported problem

A user/search for an undergraduate engineering degree (e.g. B.E./B.Tech) could surface
`Technical/Polytechnic` institutions as if they granted the degree, and a Polytechnic could
be presented as degree-granting for engineering.

## 2. Actual source of truth (found in audit)

The AISHE institution dataset (73,969 IndianInstitution rows) stores **all** polytechnics
under the single shared type string `Technical/Polytechnic`. There is **no** per-row flag
distinguishing "diploma-only polytechnic" from "degree-granting engineering college" — the
whole 5,337-row block shares one type token.

Prior to Phase 23.2/23.1, two separate layers inferred a degree from this coarse type:

1. **Category discovery** (`src/lib/education-institutions/service.ts`): a degree-only query
   such as `B.TECH Computer Science` derived the token `Technical`, which then matched every
   `Technical/Polytechnic` row via `/technical/i` — a false positive by token, not by
   verified program.
2. **Candidate resolution** (`src/lib/university-matching/candidate.ts`): `getSingleCandidate`
   could assign basis `institutionType-category` for a degree-only context at a Polytechnic
   row.

These were **data/classification** problems, not frontend labels. The label-only fix in the
previous commit did not stop the category/candidate layers from still leaking diploma-level
institutions into degree-only outcomes.

## 3. Code paths audited (A1)

Full scan of: Prisma schema, seed/import/reconciliation scripts, institution classification,
program classification, Career→Program, Program→University, university matching, institution
search/detail/filters, roadmap, career library, university cards, APIs (institutions,
college-search, stats), server actions, recommendation services.

Relevant definitions:
- `isDiplomaLevelInstitutionType()` — `service.ts`
- `deriveInstitutionTypeTokens()` — `service.ts` (diploma → `Polytechnic` only; degree →
  `Technical`/`University`)
- `institutionQualificationLabel()` — `service.ts`
- `getSingleCandidate()` degree-only guard — `candidate.ts`
- Roadmap diploma branch (`buildRoadmap`, `SCHOOL_CLASS10` + `diplomaIntent`) — `rules.ts`
- Radix/harmless API endpoints (`institutions`, `college-search`, `stats`) return raw AISHE
  type only, no degree inference.

No other path maps institution type → engineering degree.

## 4. Evidence

See `phase23_2-polytechnic-audit.json`, `tests/phase23-2-polytechnic.test.mjs` (G1–G10),
`tests/polytechnic-diploma.test.mjs`, `tests/education-institution.test.mjs`.