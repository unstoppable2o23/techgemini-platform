# Phase 23.1 — Diploma vs Degree Separation Audit

**Date:** 2026-09-05

---

## 1. The separation guarantee

The system must never present a **diploma/polytechnic** qualification as a **B.E./B.Tech/4-year degree**, and never present a degree as a diploma. After this phase, that guarantee is enforced at three independent layers:

### Layer 1 — Token mapping (`deriveInstitutionTypeTokens`)
- `excludeIf: ["diploma"]` on the degree-family Technical rule.
- Resulting behavior (verified by tests):

| Degree / diploma name | Mapped categories |
|-----------------------|-------------------|
| `B.TECH Computer Science` | `["Technical"]` |
| `BE Mechanical Engineering` | `["Technical"]` |
| `B.E. Civil Engineering` | `["Technical"]` |
| `M.Tech Electronics` | `["Technical"]` |
| `Diploma in Mechanical Engineering` | `["Polytechnic"]` |
| `Diploma in Civil / Electrical / Electronics / Computer Engineering` | `["Polytechnic"]` |

The two category sets are **disjoint**.

### Layer 2 — Roadmap
- Class-10 students get a two-track roadmap: academic (Class 11–12 → degree) vs technical (Diploma/Polytechnic). The diploma branch wording explicitly states "a diploma is not the same as an engineering degree" and does not sequence the student toward a B.E./B.Tech as the diploma itself.

### Layer 3 — UI + catalog
- Polytechnic institutions render the explicit "Diploma / Polytechnic" label with "not a B.E./B.Tech degree institution" clarifier.
- **0 Program (degree) rows are attached to polytechnic institutions** — a degree program is never shown at a polytechnic venue (golden case F).
- The degree catalog contains **0 technical Diploma-in-Engineering rows** to mislabel; only legitimate PGDIPLOMA (postgraduate) entries exist.

---

## 2. Diploma-degree catalog inventory (9 rows, all PGDIPLOMA)

HR, Event Management, Imaging/Radiology, Clinical Research, Animation, Fashion/Interior/Jewellery Design, Photography, Sound Engineering, Archaeology, Disaster Management, Landscape Design, Dairy Technology, Industrial Safety, Culinary Arts, Emergency Medicine (Paramedic), Medical Ultrasound (Sonographer), Screenwriting/Filmmaking. None is a technical "Diploma in X Engineering"; none is a B.E./B.Tech source.

---

## 3. Remaining limitation (documented, not blocking)

Because the AISHE dataset stores every polytechnic-type institution under the single type string **`Technical/Polytechnic`**, the system cannot distinguish per-institution diploma-only vs degree-granting status at query level. The system therefore:
- never attaches degree programs to polytechnic rows (0 Program rows),
- renders a neutral disclaimer,
- relies on roadmap + token contracts to keep the two tracks distinct.

No evidence exists in the dataset to claim a given polytechnic also runs B.E./B.Tech; none is fabricated.
