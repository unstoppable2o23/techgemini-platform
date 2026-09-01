# Institutional Gap Report ÔÇö Before Phase 18

**Date:** 2026-08-28
**Counts:** University 12, IndianInstitution 73966, Program 62

## High-value India institutions ÔÇö presence

Ô£ô Indian Institute of Technology Bombay
Ô£ô Indian Institute of Technology Delhi
Ô£ô Indian Institute of Technology Madras
Ô£ô Indian Institute of Technology Kanpur
Ô£ô Indian Institute of Technology Kharagpur
Ô£ô Indian Institute of Technology Roorkee
Ô£ô Indian Institute of Technology Guwahati
Ô£ô Indian Institute of Technology Hyderabad
Ô£ô Indian Institute of Technology Indore
Ô£ô Indian Institute of Technology (BHU) Varanasi
Ô£ù National Institute of Technology Tiruchirappalli
Ô£ù National Institute of Technology Surathkal
Ô£ù National Institute of Technology Warangal
Ô£ù International Institute of Information Technology Hyderabad
Ô£ù Indian Institute of Information Technology Allahabad
Ô£ô Indian Institute of Management Ahmedabad
Ô£ô Indian Institute of Management Bangalore
Ô£ù Indian Institute of Management Calcutta
Ô£ô Indian Institute of Management Lucknow
Ô£ù All India Institute of Medical Sciences New Delhi
Ô£ù All India Institute of Medical Sciences Bhopal
Ô£ô University of Delhi
Ô£ô Jawaharlal Nehru University
Ô£ô Banaras Hindu University
Ô£ô Anna University
Ô£ô Jadavpur University
Ô£ù BITS Pilani
Ô£ô Ashoka University
Ô£ô Shiv Nadar University
Ô£ù OP Jindal Global University
Ô£ô Plaksha University
Ô£ù Vellore Institute of Technology

Missing India (11): National Institute of Technology Tiruchirappalli, National Institute of Technology Surathkal, National Institute of Technology Warangal, International Institute of Information Technology Hyderabad, Indian Institute of Information Technology Allahabad, Indian Institute of Management Calcutta, All India Institute of Medical Sciences New Delhi, All India Institute of Medical Sciences Bhopal, BITS Pilani, OP Jindal Global University, Vellore Institute of Technology

## High-value International institutions ÔÇö presence

Ô£ô Massachusetts Institute of Technology
Ô£ô Stanford University
Ô£ô Harvard University
Ô£ô University of Oxford
Ô£ô University of Cambridge
Ô£ù California Institute of Technology
Ô£ù University College London
Ô£ô ETH Zurich
Ô£ô National University of Singapore
Ô£ù University of Toronto
Ô£ù University of Melbourne
Ô£ù Technical University of Munich
Ô£ù University of Tokyo
Ô£ù Peking University
Ô£ù University of British Columbia

Missing International (8): California Institute of Technology, University College London, University of Toronto, University of Melbourne, Technical University of Munich, University of Tokyo, Peking University, University of British Columbia

## Career ├ù Region matrix (institution coverage per cell)

| Career Domain | North India | West India | South India | East India | USA | UK | Europe | Asia |
|---------------|-------------|------------|-------------|------------|-----|----|--------|------|
| AI/Data | 24633 | 16579 | 20010 | 8071 | 6 | 3 | 1 | 2 |
| Medical/Health | 24633 | 16579 | 20010 | 8071 | 6 | 3 | 1 | 2 |
| Science | 24633 | 16579 | 20010 | 8071 | 6 | 3 | 1 | 2 |
| Business/Finance | 24633 | 16579 | 20010 | 8071 | 6 | 3 | 1 | 2 |
| Design | 24633 | 16579 | 20010 | 8071 | 6 | 3 | 1 | 2 |
| Engineering | 24633 | 16579 | 20010 | 8071 | 6 | 3 | 1 | 2 |

*Note: Region counts are total institutions per region, not per career domain. Empty/weak cells drive insertion priority (e.g., East India, Europe, Asia have thin coverage for many domains).*

## Existing data quality check (audit only, read-only)

Near-duplicates (same normalized name, different IDs) ÔÇö sample (first 10):
- "AMITY UNIVERSITY" (cmt9xxgsg001gkarfep9b8se6) Ôëê "AMITY UNIVERSITY" (cmt9xxgsg001fkarfnszt28c2)
- "AMITY UNIVERSITY" (cmt9xxgsg001hkarfe6whoojs) Ôëê "AMITY UNIVERSITY" (cmt9xxgsg001fkarfnszt28c2)
- "CAPITAL UNIVERSITY" (cmt9xxgsn0054karfg52ctqyz) Ôëê "Capital University" (cmt9xxgsn0053karf3o0st2yb)
- "CENTURION UNIVERSITY OF TECHNOLOGY AND MANAGEMENT" (cmt9xxgss005ukarfctx32jpg) Ôëê "Centurion University of Technology and Management" (cmt9xxgsr005tkarfyerb8vms)
- "Chandigarh University" (cmt9xxgst0061karfp44pvc3u) Ôëê "CHANDIGARH UNIVERSITY" (cmt9xxgst0062karf6oir6eld)
- "Dr. C.V RAMAN UNIVERSITY" (cmt9xxgsz008kkarfwlm98y4v) Ôëê "Dr. C.V. Raman University" (cmt9xxgsz008jkarfmpnsdrsc)
- "IILM UNIVERSITY" (cmt9xxgta00cdkarf26ygjibr) Ôëê "IILM UNIVERSITY" (cmt9xxgta00cckarf34gulyrp)
- "MAHATMA GANDHI UNIVERSITY" (cmt9xxgty00lkkarf8kcf68jd) Ôëê "Mahatma Gandhi University" (cmt9xxgty00ljkarfesmhhlfm)
- "National Forensic Sciences University" (cmt9xxgu700nvkarfu9qm1g05) Ôëê "NATIONAL FORENSIC SCIENCES UNIVERSITY" (cmt9xxgu700nwkarfi2qauek6)
- "Radha Govind University" (cmt9xxguq00s8karf0m24t4j8) Ôëê "RADHA GOVIND UNIVERSITY" (cmt9xxguq00s9karfru550ct9)
Total near-duplicate groups (normalized): 1392

Unreachable/mislabeled:
- Indian institutions missing website: 17451 / 73966
- Universities missing country: 0 / 12

## Summary gaps (drives Phase 18 priority)

- Missing high-value India: 11 (e.g., National Institute of Technology Tiruchirappalli, National Institute of Technology Surathkal, National Institute of Technology Warangal, International Institute of Information Technology Hyderabad, Indian Institute of Information Technology Allahabad)
- Missing high-value International: 8 (e.g., California Institute of Technology, University College London, University of Toronto, University of Melbourne, Technical University of Munich)
- Thin regions: East India, parts of Europe/Asia have <5 institutions per career domain
- Near-duplicates: 1392 groups logged for future hygiene phase (not fixed now)
- All existing institutions are READ-ONLY in this phase ÔÇö fixes logged, not applied
