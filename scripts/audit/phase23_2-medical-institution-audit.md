# Phase 23.2 — Medical Institution Audit

**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1

---

## 1. Approach (B8/B10, Part C)

No IndianInstitution or University records were created, modified, or deleted. Institutions are
surfaced only when there is real program evidence. Four distinct discovery tiers are enforced:

1. **verified-program** — institution has a VERIFIED Program row with an official source URL.
2. **curated** — institution has an explicit education-institution mapping.
3. **institutionType-category** — coarse AISHE category (never for degree-only outcomes at
   diploma-level institutions).
4. **none** — honest not-found with disclaimer.

A medical institution is only shown as a relevant option for a given program when a matching
Program row exists (B8: "only show a medical institution as a relevant option when there is
actual program evidence").

## 2. Institutions with verified medical programs (MBBS)

5 pre-existing AISHE institutions now carry VERIFIED MBBS Program rows (KGMU, MAMC, LHMC, Grant
MC, CMC Vellore) — see `phase23_2-medical-program-audit.md`. These resolve
`mappingBasis=verified-program` rather than category guess (M19/M23). Their `institutionType` is
degree-granting (University/College), never diploma-level (M23).

## 3. Discovery / filtering (B10)

Where supported, students discover institutions by medical field, program, qualification,
country, state, and institution type. Program rows carry `level` + degree, enabling
qualification-aware filtering. The medical registry + official-source gate (M4) ensures only
evidence-backed institutions are presented as medical options.

## 4. Data integrity (Part C / H)

- IndianInstitution: 73,969 → 73,969 (**protected**).
- University: 20 → 20 (**protected**).
- No duplicate institutions created (dedupe via AISHE identity; none added).
- Checks performed before and after; counts stable (tests M21, G9).