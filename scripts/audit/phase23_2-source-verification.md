# Phase 23.2 — Source Verification

**Phase:** 23.2 — polytechnic pathway hardening and medical education intelligence v1

---

## 1. Medical registry sources (official-only gate, test M4)

All 21 disciplines cite sources only from the approved official set (www-normalised):

- NMC — nmc.org.in
- NTA — nta.ac.in
- Dental Council of India — dciindia.gov.in
- Indian Nursing Council — indiannursingcouncil.org
- Pharmacy Council of India — pci.nic.in
- NCISM — ncismindia.org; NCH — nch.org.in
- AHP NEC (NCAHP) — ahpnec.gov.in
- VCI — vci.nic.in; ICAR — icar.org.in
- NCERT — ncert.nic.in

Disciplines without a central statutory register (public-health, clinical-research, health-it-
digital, hospital-management, nutrition, genetics, biomedical) cite none and **state explicitly**
that there is no central statutory register (test M3). This is honest absence, not a gap. No
educational blogs or non-authoritative sources are used (B9).

## 2. Verified MBBS program sources

Every added program has `source=official-website` and an official `sourceUrl` (test M17):
- KGMU — https://www.kgmu.org
- MAMC — https://mamc.delhi.gov.in/ (government domain)
- LHMC — https://www.lhmc.nic.in (government domain)
- Grant MC Mumbai — https://gmcjjh.edu.in
- CMC Vellore — https://www.cmch-vellore.edu

## 3. Where source, URL and verification date are exposed

- Medical registry sources (name + URL) surface in Career Library MEDICAL EDUCATION PATH and
  student 360 with the note "Wording is conservative — confirm requirements with the relevant
  council and institution."
- Program rows expose `source`, `sourceUrl`, `verificationStatus`, `verifiedAt` and drive
  institution profile badges/freshness in the matching/UI layer.

## 4. NEET (B5)

NEET-UG is attributed to NTA with its notified scope and always caveated:
"Check the current official admission rules for the specific program and institution." It is
never stated as universal for all healthcare careers.