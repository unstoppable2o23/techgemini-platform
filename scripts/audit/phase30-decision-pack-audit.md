# Phase 30 — Counselling Decision Pack & Student Action Plan v1 (probe)

Generated live at audit time.

## Protected dataset counts
- career=289
- degree=751
- academicProgram=242
- program=80
- university=20
- indianInstitution=73969
- subject=59
- careerEducationPathway=2111
- careerProgramMapping=856

## Decision Pack kernel (determinism + read-only)
- student=cmto30wee0006enfuomli24wg
- pack x2 byte-identical: true
- careerDirections=10 educationPathways=10 universityOptions=4
- actionPlan=8 currentDecision=complete_profile stage=Selected Pathway
- parentSummary keys=6 · counselor block present=true
- no score/fit leakage in pack JSON: true
- no assessment 'answers' key in pack JSON: true

## Action-plan determinism + priorities
- plan x2 byte-identical: true
- actions=8 high=1 low=1 (low = counselor steps)
- ids=complete_profile, build_roadmap, compare_careers, explore_programs, shortlist_careers, shortlist_universities, take_assessments, book_appointment
- every action carries a real destination: true

## Engine freeze (byte-identical around a pack run)
- matches before/after pack run identical: true
- pack careers stay within engine matches: true

## Protected dataset counts (after pack run)
- unchanged after getDecisionPack: true

## Analytics event allowlist (4 Phase 30 events)
- record.ts has all 4: true
- client.ts has the 3 student events only (no counselor_reviewed): true
- student events route allowlists the 3 student events only: true
- counselor_reviewed is recorded server-side only (counselor route + page)

## Access contracts (static)
- student route self-scopes via session.user: true
- counselor route enforces isolation via loadAuthorizedStudent: true
