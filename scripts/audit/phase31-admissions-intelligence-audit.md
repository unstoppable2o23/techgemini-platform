# Phase 31 — Admissions & Counselling Intelligence V1 (probe)

Generated live at audit time.

## Protected dataset counts (before)
- career=289
- degree=751
- academicProgram=242
- program=80
- university=20
- indianInstitution=73969
- subject=59
- careerEducationPathway=2111
- careerProgramMapping=856

## Official-source registry
- entries=16
- unique ids: true
- all fields present: true
- all canonical URLs https: true
- spot lookups: nta=nta nmc=nmc jee-advanced=jee-advanced
- subdomain-aware official check: jeemain.nta.nic.in=true fake domain=false

## Kernel determinism + read-only
- program guidance x2 byte-identical: true
- student guidance x2 byte-identical: true
- INFORMATION_MISSING on empty input: true
- kernel never imports prisma: true

## Vocabulary honesty (no fabricated numbers / years)
- no fabricated numbers in elective guidance: true
- no hardcoded years (dates masked as provenance): true
- verification states used: PARTIALLY_VERIFIED, SOURCE_AVAILABLE, NOT_VERIFIED
- 'never inferred' honesty present in general guidance: true

## Decision Center flow-through (real profile)
- focusPrograms=6 recommendedPrograms=6
- focusPrograms ⊆ recommendedPrograms: true
- readiness=READY_TO_RESEARCH missingInfo=6 nextActions=6

## Decision Pack (per-pathway admissions present)
- pack educationPathways=10 with admissions block=6
- pack admissionsSummary present: true (Ready to research)
- no engine score leakage in pack JSON: true

## Engine freeze (byte-identical around a guidance run)
- matches before/after identical: true

## Analytics allowlist (4 Phase 31 events)
- record.ts has all 4: true
- client.ts has all 4: true
- events route allowlists all 4: true

## Read surfaces (static self-scoping)
- student /admissions page fetches only the decision-center API: true
- it is NOT a dynamic [id] route: true
- counselor page keeps server auth loadAuthorizedStudent: true
- 360 client reads decisionCenter admissions guidance: true
- nav exposes /admissions for the student: true

## Protected dataset counts (after)
- unchanged after full audit run: true
