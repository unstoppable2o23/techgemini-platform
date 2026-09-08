# Phase 23.2 — Medical Program Audit

**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1

---

## 1. Career → Program mapping (existing, verified intact — B7)

| Career | Primary program | Level |
|--------|-----------------|-------|
| Medicine | Medicine (MBBS) | Professional Degree |
| Dentistry | Dentistry (BDS) | Professional Degree |
| Pharmacology | Pharmacy (B.Pharm) | Bachelor's |
| Nursing | Nursing | Bachelor's |
| Physiotherapy | Physiotherapy | Bachelor's |
| Audiology | Audiology and Speech-Language Pathology | Bachelor's |
| Occupational Therapy | Occupational Therapy | Bachelor's |
| Optometry | Optometry | Bachelor's |
| Veterinary Science | Veterinary Science | Bachelor's |
| Clinical Research | Clinical Research (+ B.Pharm, Life Sciences) | Bachelor's |

No health career is mapped to MBBS unless it is actually Medicine (B7 honoured). Programs
already carry `level`, `studyMode`, `duration`, `source`, `verificationStatus` (A6 — reused, no
new taxonomy).

## 2. Verified MBBS programs added (this phase: +5 → 80)

| Institution | City/State | Source | Status |
|-------------|------------|--------|--------|
| King George Medical University | Lucknow, UP | https://www.kgmu.org | VERIFIED |
| Maulana Azad Medical College | Delhi | https://mamc.delhi.gov.in/ | VERIFIED |
| Lady Hardinge Medical College | Delhi | https://www.lhmc.nic.in | VERIFIED |
| Grant Medical College, Mumbai | Mumbai, MH | https://gmcjjh.edu.in | VERIFIED |
| CMC Vellore (Inst. Code - 011) | Vellore, TN | https://www.cmch-vellore.edu | VERIFIED |

All: MBBS, Bachelor's/Professional, Full-time, 5.5 years, `source=official-website`, VERIFIED,
`verifiedAt` present. All resolve via `mappingBasis=verified-program` (M19). **No UNVERIFIED
rows; Program exactly 80 (M22).** Only these five official-website-sourced rows were added;
nothing fabricated.

## 3. Program counts

| Entity | Before | After | Δ |
|--------|--------|-------|---|
| Program | 75 | 80 | +5 |
| Program UNVERIFIED | 0 | 0 | 0 |
| Verified MBBS (degree MBBS) | 4 | 9 | +5 (7 India + 2 international) |