# Phase 23.1 — Roadmap Regression Audit

**Date:** 2026-09-05

---

## 1. What changed in the roadmap generator

`src/lib/roadmap/rules.ts` — the `SCHOOL_CLASS10` branch only. No other stage was modified. The engine is untouched.

Before: every Class-10 roadmap assumed the academic route (Class 11–12 → degree).

After: every Class-10 roadmap first emits a neutral **"Choose your post–Class 10 pathway"** step (both routes named, no framing of one as inferior), then branches:
- **academic** (`diplomaIntent=false`): unchanged Class 11–12 → degree sequence.
- **diploma/technical** (`diplomaIntent=true`): Explore → Compare branches → Verify eligibility → Select institution/programme → Complete diploma, plus India lateral-entry caveat OR abroad acceptance check, plus an academic-alternative step.

## 2. Engine impact

None. `diplomaIntent` flows only into `SCHOOL_CLASS10` roadmap step generation; it never feeds `getCareerMatches`, scoring, confidence, or university matching. Verified by:
- Engine freeze golden harness: byte-identical vs `phase18-1-engine-freeze-baseline.json` (normalized for timestamps/suffix).
- `phase21-roadmap.test.mjs` (Stage/India/Abroad/conservation) — all pass unchanged.
- `phase21-golden-profiles` roadmap generation — all pass.

## 3. Conservation / neutrality checks (all pass)

- No Class-10 step ever suggests PG/Masters/PhD.
- No "guaranteed admission/job/scholarship/100% placement" language.
- Diploma branch lateral entry is conditional ("subject to the applicable state and institution rules", "not automatic").
- Abroad diploma branch verifies acceptance ("check whether your diploma is accepted by the target institution/country").
- No economic/ability implications anywhere (neutral phrasing).

## 4. Test result

Full suite: **532 pass / 0 fail** (includes new `tests/polytechnic-diploma.test.mjs` Class-10 branching tests and existing `phase21-roadmap.test.mjs`).
