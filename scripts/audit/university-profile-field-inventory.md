# University Profile Field Inventory — Phase 19

**Date:** 2026-08-28
**Models audited:** University, IndianInstitution, Program

## University (global, 20 records)

| Field | Type | Reliable data | Profile candidate | Notes |
|-------|------|---------------|-------------------|-------|
| id | String | ✓ | Hidden (internal) | Never shown, used for linking |
| name | String | ✓ | **Identity** | Official name as published |
| country | String | ✓ | **Identity** | Country |
| region | String? | Partial | **Identity** | State/province where available, else "Not available" |
| qsRank | Int? | Partial | **Display-only** | QS rank where available (from Phase 14 import), else "Not available" — never influences matching |
| previousRank | Int? | Partial | Hidden | Not shown in profile (internal) |
| status | String? | Partial | Identity | Public/Private where available |
| size, focus, research | String? | Partial | Identity | Where available |
| overallScore, academicRepScore, employerRepScore, facultyStudentScore, citationsScore, intlFacultyScore, intlStudentScore, employmentScore, sustainabilityScore | Float? | Partial | Display-only | QS scores where available, else "Not available" |
| domains | String[] | ✓ | Identity | Domains |
| webPages | String[] | ✓ | Identity | Official website |
| logoUrl | String? | Partial | Identity | Where available |
| tenantId | String | ✓ | Hidden | Internal |
| programs | Program[] | ✓ | **Programs** | Verified programs via relation |

**Out of scope (do not invent):** tuition, acceptance rate, established year (not in University model), campus details, facilities, history — explicitly do not exist, never shown.

## IndianInstitution (India, 73,969 records)

| Field | Type | Reliable data | Profile candidate | Notes |
|-------|------|---------------|-------------------|-------|
| id | String | ✓ | Hidden | Internal |
| name | String | ✓ | **Identity** | Official name |
| type | String | ✓ | Identity | College/University/Standalone/R&D Institute |
| state | String | ✓ | **Identity** | State |
| district | String? | Partial | Identity | District where available, else "Not available" |
| website | String? | Partial | Identity | Official website where available, else "Not available" |
| yearOfEstablishment | String? | Partial | Identity | Where available |
| location | String? | Partial | Identity | City where available |
| institutionType | String? | Partial | Identity | Technical/University etc. |
| management | String? | Partial | Identity | Central/State/Private |
| universityName | String? | Partial | Identity | Affiliating university |
| aisheCode, wdId | String? | Partial | Hidden | Internal identifiers |
| universityAisheCode | String? | Partial | Hidden | Internal |
| source | String | ✓ | Hidden | Source (aishe/ugc-verified) |
| programs | Program[] | ✓ | **Programs** | Verified programs |

**Out of scope:** rankings (explicitly deferred), admission stats, tuition — never shown, explicitly "Not available" if queried.

## Program (75 records, VERIFIED 62)

| Field | Type | Reliable data | Profile candidate | Notes |
|-------|------|---------------|-------------------|-------|
| id | String | ✓ | Hidden | Internal |
| name | String | ✓ | **Programs** | Official program name (e.g., "B.Tech Computer Science and Engineering") |
| level | String? | Partial | Programs | Bachelor's/Master's where supported |
| studyMode | String? | Partial | Programs | Full-time where supported |
| duration | String? | Partial | Programs | 4 years etc. where supported |
| source | String | ✓ | **Programs** | official-website |
| sourceUrl | String? | ✓ | **Programs** | Direct program page URL |
| verificationStatus | String | ✓ | **Programs** | VERIFIED/CATEGORY_BASED/UNVERIFIED |
| verifiedAt | DateTime? | ✓ | **Programs** | Verification date for freshness |
| degreeId | String? | ✓ | **Programs** | Link to canonical Degree |
| specializationId | String? | Partial | Programs | Link to Specialization where applicable |
| universityId | String? | ✓ | Hidden | Link to University (global) |
| indianInstitutionId | String? | ✓ | Hidden | Link to IndianInstitution (India) |
| degree | Degree | ✓ | **Programs** | Degree name via relation |
| specialization | Specialization | Partial | **Programs** | Specialization name |

**Out of scope:** tuition, fees, living costs, admission probability, acceptance rate — never shown.

## Career context (student-specific, from matching)

- `Career → CareerEducationPathway → Degree/Specialization → Program → Institution` chain
- `matchScore`, `confidenceScore`, `reasons` from Phase 16 matcher — reused verbatim, no fork
- Student preferences: `targetCountry`, `targetColleges`, `tuitionBudget` (where reliable), `education pathway`

**Never shows:** admission probability, "competitive"/"easy", internal score fields, "best university" claims.

## Summary

- **Reliable data → profile candidates:** name, location (country/state/city/district), dataset type, programs grouped by Degree (with verification badges + freshness + source), career context (when applicable)
- **Partial data → "Not available" when empty:** qsRank, region, district, website, district, institutionType, management, program level/studyMode/duration
- **Does not exist → explicitly out of scope:** tuition, acceptance rate, eligibility invention, rankings in scoring, campus details — never shown, never inferred

**Existing detail flow before Phase 19:** Universities page is list-only (table with QS rank, name, country, scores, domains, website) — no detail profile. Program display in matching is via `institution.program` when `mappingBasis=verified-program` but not in a dedicated profile view. API contract for matching returns `institution`, `program`, `degree`, `specialization`, `verificationStatus`, `matchScore`, `confidenceScore`, `reasons` — this contract is extended for profiles.

