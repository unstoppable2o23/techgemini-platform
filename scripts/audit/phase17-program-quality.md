# Phase 17 — AcademicProgram Catalogue Quality

**Scope:** quality of the curated canonical programme catalogue (`AcademicProgram`, 242 rows) —
uniqueness, level/category structure, and the absence of junk / "any degree" entries.

## Volumes
- **Total programmes:** 242 · **Active:** 242 · **Inactive:** 0.
- **Duplicate names:** 0 (case-insensitive) · **Duplicate slugs:** 0.

## Level distribution
| Level | Count |
|---|---|
| Bachelor's | 140 |
| Master's | 87 |
| Professional Degree | 7 |
| Diploma | 6 |
| Certificate | 2 |

## Category distribution (17 categories)
| Category | Programmes |
|---|---|
| Engineering | 32 |
| Technology | 20 |
| Humanities | 18 |
| Design | 17 |
| Social Sciences | 17 |
| Media | 15 |
| Life Sciences | 14 |
| Agriculture | 11 |
| Business | 22 |
| Healthcare | 30 |
| Hospitality | 8 |
| Environment | 7 |
| Education | 7 |
| Architecture | 6 |
| Law | 6 |
| Quantitative | 8 |
| Sports | 4 |

## Curated vs. inherited junk
- The catalogue was authored as a **clean canonical set** — junk entries that existed in the legacy
  `Degree` catalogue (e.g. "ANY degree", "12TH pass", deprecated count of ~374 junk values) were
  intentionally **excluded** and are not modelled here.
- Natural-language curations match the education taxonomy: degree names are specific, non-vague
  (e.g. `Computer Science`, `Civil Engineering`, `Law (LLB)`, `Medicine (MBBS)`), and never
  generic pass-level tokens.
- Every programme slug referenced by a `CareerProgramMapping` resolves to a catalogue row
  (`unknownSlugs = 0`).

## Chapter-5 conformance (no generic fallback)
- `PRIMARY`/`COMMON`/`SPECIALIZED`/`RELEVANT`/`OPTIONAL` relationships reference concrete,
  academically-sound programmes.
- No mapping uses a generic "any degree" or catch-all programme.