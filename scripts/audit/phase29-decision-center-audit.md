# Phase 29 — Personalized Career & Education Decision Center v1 (probe)

Generated live at audit time.

## Protected dataset counts
- Career rows=289
- Degree rows=751
- Program rows=80
- Program UNVERIFIED=0
- IndianInstitution rows=73969

## Decision-center kernel (determinism)
- student=cms4mwqnm0008k44cff1t5uyw role=undefined
- build x2 byte-identical: true
- strongOptions=0 explore=0 moreInfo=10
- recommendedPrograms=0 institutionOptions=0
- gaps=1 nextDecision=Complete your career profile
- roadmapSteps=0 progress=0
- parentSummary present=true counselorBrief present=true

## Grouping + status vocabulary
- distinct statuses used=MORE_INFORMATION_NEEDED
- 'Supported by your profile' is evidence-derived, no numeric fit percent in any option label

## MBBS vs BDS distinctness + diploma not flattened
- Medicine careers=1, Dentistry=1
- MBBS and BDS are distinct career ids

## Role + profile guards (lib level)
- guard tests: [{"role":"COUNSELOR","result":"returned"},{"role":"STUDENT","present":true}]

## Analytics event allowlist (7 Phase 29 events)
- added events=decision_center_viewed, career_option_opened, program_option_opened, institution_option_opened, decision_shortlisted, pathway_selected, counselor_review_clicked

## 360 integration
- student360 exposes decisionCenter block via getStudent360 (reuses already-computed careerMatches, no second engine call)
