# Phase 16B — Career Matching Quality Validation V1

**Status**: COMPLETE
**Build**: 311 existing tests + 1 new regression test (T2b), all pass
**Typecheck**: clean (`npx tsc --noEmit --skipLibCheck`)
**Build**: compiled successfully
**Harness**: `scripts/audit/phase16b-golden-harness.mjs` (reusable, 23 golden profiles, real DB path)
**Machine output**: `scripts/audit/phase16b-report.json`

> **Scope / honesty note.** This is a **quality validation**, not a scientific
> validation. It compares the production `getCareerMatches` engine against 23
> hand-authored golden student personas and reports observed behaviour. No claim
> is made that the engine is scientifically validated or that recommendations
> are proven clinically/occupationally correct. Golden profiles are **test data
> only** and were never persisted as production student accounts.

---

## A. What was validated

The real database path (not the pure `scoreCareer` function):

1. Seed a transient tenant + user + `StudentProfile` + `StudentCareerProfile`.
2. Emit signals via the real `generateStudentCareerProfile`.
3. Score all 251 active careers via `getCareerMatches(user.id, { limit: 20 })`.
4. Teardown all seeded rows in `finally` (no residue in the DB).

23 golden profiles A–W span Class 8 → undergraduates, science/commerce/humanities
streams, profile-only, assessment-only, preferred-only, conflicting-evidence and
no-data personas. Each profile declares an **expected set of career families**
(not a single hard-coded career), because the deliverable is family-level
coverage, not one exact career.

---

## B. Engine artifact fixed (smallest safe fix)

**Finding — genuine engine bug (sub-string concept collision).**

`embeddedCanonicalKey` in `src/lib/career-matching/semantic-match.ts` matched
canonical terms with raw `String.includes`, so a canonical concept was resolved
any time its letters appeared **inside** a larger word. Because `art` is a
common fragnet, **39 of the 59 embedded career-trait resolutions across the
catalog collapsed onto the `art` concept** for wholly unrelated meanings:

| Trait value | Career | Wrongly resolved to |
|---|---|---|
| `Partnership deals` | Business Development | `art` |
| `Articulate` | Law / Strategy Consulting | `art` |
| `Smart devices` | Internet of Things | `art` |
| `Charting Basics` | Maritime Studies | `art` |
| `Startups and founders` | Venture Capital Analyst | `art` |
| `Startups in finance` | Fintech | `art` |
| `Agri startups` | AgriTech | `art` |
| `Business Partnering` | Cost & Management Accounting | `art` |
| `Multi-department Coordination` | Hotel Management | `art` |
| `IP Searches (Prior Art)` | Intellectual Property Rights | `art` |

**Impact**: any student with an `Art` subject/interest (or the `art` concept)
matched dozens of unrelated business, law, finance and engineering careers. In
the golden profile **K (Arts / design)**, `Business Development` was ranked **#1**
for an art/design/creative-writing student purely because of this collision.

**Fix**: `embeddedCanonicalKey` now requires the canonical human phrase (and its
underscore key) to appear on **whole-word boundaries** via a literal
`(?:^|[^A-Za-z0-9])<phrase>(?:$|[^A-Za-z0-9])` regex, and still returns null when
more than one candidate matches. Legitimate whole-word matches are preserved
(`Logical Mathematical Intelligence → logical_mathematical`, `Human biology →
biology`, `Risk mathematics → mathematics`, `Molecular Biology (PCR) → biology`,
`Game Art & Design → art`).

**Regression test**: `T2b` in `tests/career-matching-semantic.test.mjs`.

**Verification after fix**:
- Profile K top-5 families become **Design & Creative, Media & Communication**
  (5/5 expected families) — the Business/Sales false-positive is gone.
- Embed-collision count for career traits drops from 59 → 5, and all 5 remaining
  are redundant: the careers still match via their whole-word
  `recommendedSubjects` (e.g. Medical Laboratory Sciences has `Biology`,
  `Chemistry`, `Physics`; Fine Arts has `Art`). No practical loss.

---

## C. Classification of results against golden families (A–L)

Top-N coverage (share of a profile's expected families found in its top-N):

| Profile | Top-5 | Top-10 | Comment |
|---|---|---|---|
| A  Class 8 science | 4/5 | 9/10 | Strong |
| B  Class 10 sci+math | 3/5 | 6/10 | OK |
| C  Class 11 PCM | 4/5 | 7/10 | Strong |
| D  Class 11 PCB | 3/5 | 8/10 | Strong |
| E  Class 12 commerce | 3/5 | 8/10 | Strong |
| F  Class 12 humanities | 3/5 | 4/10 | Top-10 thin (few humanities careers) |
| G  UG CS | 4/5 | 9/10 | Strong |
| H  UG mechanical | 3/5 | 6/10 | OK |
| I  biotech/life-sci | 3/5 | 8/10 | Strong |
| J  commerce/accounting | 3/5 | 7/10 | OK |
| K  **arts/design** | **5/5** | 7/10 | **Fixed** (was false-positive-dominated) |
| L  psychology/social-sci | 2/5 | 7/10 | OK |
| M  medicine interest | 2/5 | 7/10 | Working |
| N  AI/software interest | 4/5 | 9/10 | Strong |
| O  business/entrepreneurship | 3/5 | 6/10 | OK |
| P  law | 2/5 | 3/10 | Top-10 thin (law family small) |
| Q  architecture/design | 3/5 | 6/10 | OK |
| R  undecided/broad | 2/5 | 5/10 | OK |
| S  assessments only | 2/5 | 3/10 | See data-gap finding |
| T  registration only | 4/5 | 7/10 | Strong |
| U  almost no data | 0/5 | 0/10 | Expected (no evidence) |
| V  conflicting evidence | 3/5 | 7/10 | OK |
| W  preferred-only | 2/5 | 2/10 | See data-gap finding |

**Overall family coverage is strong** for evidence-bearing profiles; degradation
concentrates in small families and no-data personas.

---

## D. Score & confidence distributions

Score buckets (matches across all 23 profiles × top-20, 460 rows):

| Bucket | Count |
|---|---|
| 0 | 60 |
| 1–29 | 0 |
| 30–49 | 354 |
| 50–69 | 46 |
| 70–89 | 0 |
| 90–100 | 0 |

Confidence levels: **MODERATE 31, LOW 429, HIGH 0**.

Two distribution findings (section 9):

1. **Nothing reaches a strong match (≥70) or HIGH confidence** on realistic
   data, even for a maximally-evidenced CS student with 28 assessment + profile
   signals (peak ~70 score / 65 confidence, just under the HIGH threshold).
   This is **by design**: `CONFIDENCE_CONFIG` applies a per-dimension
   `matchedDimensionCap` (4) and a coverage scale `0.7 + 0.3 × coverage`, so
   partial-dimension evidence is deliberately held below HIGH. It is a
   conservative guard, not a crash bug. Practical consequence for a product:
   the UI never shows "high confidence". Documented here, not changed (Phase
   rule: no weight/threshold changes without a proven bug).
2. **The modal band is 30–49 (354 rows)**. Scores are compressed and success
   depends strongly on the outlined `SINGLE_SIGNAL_CONTROL.breadth` term. This
   creates low intra-family discrimination and is the driver behind the
   broad-career domination finding (E).

---

## E. Failure patterns observed

- **False-positives (fixed)**: the `art` sub-string collision was the dominant
  false-positive (Profile K). Now resolved.
- **Generated / generic careers too frequent (open)**: `Agricultural
  Engineering` appears in the top-5 of **10 of 23** profiles, `Actuarial
  Science` in **9**, `Chemical Engineering` in **7** — including personas that
  are not engineering/quant oriented. Root cause: careers share a wide body of
  generic STEM traits (Physics, Chemistry, Mathematics, "Research",
  "Solving problems"), and many careers in those families have **no
  `interests`/`personalityTraits` fields** (see H), so their INTEREST/PERSONALITY
  evidence is thin and they tie on the same common traits. This is **data
  redundancy / missing-fields**, not engine arithmetic. Reported — no
  auto-mutation of career records per Phase rule.
- **Small families under-represented in top-10**: Humanities (3 careers),
  Architecture (3), Law (5), Psychology (5). A humanities/law profile's top-10
  fills with adjacent media/government careers because there simply aren't
  enough cat members to fill 10 slots topically.
- **Preferred career**: ranks **#1** for M (Medicine) and N (Software
  Engineering); **#7** for Q (Architecture). Boost is exact-name/title only and
  behaves deterministically.
- **Assessment-only (S) and preferred-only (W) score 0** (many 0-score rows):
  covered in data-gap findings below — not engine crashes.
- **Tie-break artifact**: when all scores are 0 (no-data / unmatched preferred),
  top-10 lists careers alphabetically (Actuarial Science, Additive Manufacturing
  Engineer, Advertising, Aerospace…). Emergent careers surface there by
  tie-break, not by genuine affinity — cosmetic.

---

## F. Explainability

Explanations are evidence-based and truthful:
- `matchType` tiers are **CANONICAL / ALIAS / STRUCTURED / LEXICAL** and preserve
  honesty (alias/embedded matches are reported as ALIAS at strength 0.9, never
  promoted to CANONICAL — verified by H1/T2b/T3/T3b).
- `evidence` carries `dimension`, `studentValue`, `careerTraitValue`,
  `matchType`, `sourceType`; `reasons` carry structured `evidenceType`
  (`ALIGNED`, `VERIFIED_GAP`, `DEVELOPMENT_AREA`, `MISSING_EVIDENCE`).
- Verified gaps only appear with **reliable, deduplicated, conflicting**
  evidence (H9/H10/H11, DB5/DB9, T30) — no fabricated gaps.
- The internal `trace` (preferred source, education stage) is stripped in public
  API responses (`sanitizeCareerMatch`, T32).
- Gap for students with **no reliable evidence**: the engine refuses to invent a
  gap or a career and returns lower-confidence/empty-safe results (H14, CASE 12).

---

## G. Preferred-career behaviour

- **Reasoning**: a canonical `preferredCareerId` boosts exactly that career
  (DB1, T14). A legacy free-text name boosts only on **exact name/title
  equality** (DB2, H19, H21); it never half-boosts a category (H18).
- **Confirmed** ranks: M Medicine #1, N Software Engineering #1 (via title),
  Q Architecture #7.
- **Robustness gap (open)**: everyday career wording that is **not** an exact
  catalog name/title fails to boost. Verified non-existent catalog entries:
  `Management Consultant`, `Software Engineer` (only `Software Engineering`
  exists), `Accountant` (only `Chartered Accountancy`), `Architect` (only
  `Architecture`), `Data Scientist`, `Doctor`, `Biotechnologist`, `Civil
  Engineer`, `Psychologist`. The artifact is mitigated where the career now has
  an everyday `title` (e.g. `Software Engineering` → title "Software Engineer"),
  but the `PREFERRED_CAREER_ALIASES` map is intentionally empty. This is a
  **data/alias coverage** decision to be revisited in a data phase, **not** an
  engine change.

---

## H. Data-quality gaps (section 11) — 12 active careers flagged

Careers with no `CareerTrait` records (no per-concept trait coverage at all):

- Forensic Accounting (Finance & Accounting)
- Cyber Law (Law)
- Gemology and Gem Testing (Design & Creative)

Careers missing both `interests` and `personalityTraits` (thin INTEREST /
PERSONALITY evidence):

- Veterinary Science, Visual Merchandising, Advertising, Wildlife Biology,
  Library Sciences, Forensic Science, Game Development, Information Technology
  Business Analysis, Agricultural Engineering.

**Structural gap (most consequential)**: the `CareerTrait` table contains
**ZERO APTITUDE and ZERO WORK_ENVIRONMENT records** (of 4,646 total trait rows:
SKILL 1921, INTEREST 707, PERSONALITY 717, SUBJECT 763, EDUCATION 538; APTITUDE 0,
WORK_ENVIRONMENT 0). Because assessment signals concentrate in APTITUDE and
WORK_ENVIRONMENT (Multiple Intelligences, Learning & Productivity, Ideal Career),
**assessment-only profiles match poorly** — profile S (signals such as
`logical_reasoning`, `logical_mathematical`, `prefers_quiet`) scores 0 on every
career. The APTITUDE/WORK_ENVIRONMENT dimensions have weight but no career-side
data to compare against. This is the single largest driver of the
"assessment-only → 0" and "confidence stays LOW/MODERATE" patterns.

> Per Phase rule these are **reported, not mutated**: no career/CareerTrait
> records were added, edited or deleted.

---

## I. Emerging-career frequency in top-10

43 emerging-career placements appear in top-10 across profiles. The recurring
ones are engine-semantic, not affinity-driven:

- `Machine Learning Engineering` (B, C, G, H, N, Q, T) — legitimately surfaced for
  CS/AI profiles (N holds it high).
- `Additive Manufacturing Engineer`, `AgriTech`, `AI Governance Specialist`
  (S, U, W) — these appear in **zero-evidence** profiles only via the alphabetical
  tie-break artifact (score 0), i.e. they are **not** genuine recommendations.
- `Entrepreneurship` (E, O, J) — a real match for business/venture personas.
- `Bioinformatics` (A, I, R, V) — genuine for life-science profiles.

Takeaway: new-age careers surface both legitimately (for matching personas) and
spuriously (for no-data personas through tie-break). No suppression was added;
the tie-break artifact is cosmetic and documented.

---

## J. Family inventory

| Family | Active | Emerging | note |
|---|---|---|---|
| Medicine & Healthcare | 34 | 4 | largest, well-covered |
| Technology & Software | 38 | 21 | includes many emerging |
| Engineering | 29 | 13 | broad trait overlap |
| Business & Management | 20 | 3 | good |
| Finance & Accounting | 16 | 3 | good |
| Design & Creative | 14 | 3 | good |
| Environment & Sustainability | 14 | 11 | few domestic signals |
| Life Sciences | 11 | 4 | good |
| Media & Communication | 11 | 2 | good |
| Hospitality | 9 | 0 | ok |
| Education | 9 | 1 | ok |
| Agriculture | 8 | 1 | ok |
| Government & Public Services | 8 | 1 | ok |
| Sports | 6 | 2 | ok |
| Law | 5 | 2 | small |
| Psychology & Social Sciences | 5 | 1 | small |
| Manufacturing | 4 | 0 | small |
| Logistics | 4 | 0 | small |
| Architecture | 3 | 0 | small |
| Humanities | 3 | 0 | smallest |

---

## K. What was NOT changed (per Phase constraints)

- **No engine redesign / rewrite.**
- **No scoring-weight changes.** The only code edit is the whole-word bug fix to
  `embeddedCanonicalKey` — a correctness fix, not a weight/threshold change.
- **No assessment question banks or scoring changed.**
- **No `University` / `IndianInstitution` data changed** (verified by existing
  tests: university/institution records unchanged after queries).
- **No `prisma db push --accept-data-loss`**, no seed/import required.
- **No careers auto-added** and no career/CareerTrait records mutated.
- **No scientific-validation claim** is made anywhere in this report or harness.

---

## L. Remaining risks / recommendations for a data phase (not this phase)

1. Add APTITUDE and WORK_ENVIRONMENT `CareerTrait` rows (the structural gap that
   starves assessment-only profiles and holds confidence at LOW/MODERATE).
2. Populate `interests`/`personalityTraits` on the 12 flagged careers.
3. Introduce a curated `PREFERRED_CAREER_ALIASES` map (intentionally still
   empty) so everyday wording ("Software Engineer", "Accountant", "Doctor")
   boosts the correct canonical career. Requires a product decision, not an
   engine change.
4. Assign curated differentiation traits to reduce broad-career domination
   (Agricultural Engineering / Actuarial Science / Chemical Engineering
   crowding unrelated personas).
5. Consider whether "confidence never HIGH on realistic data" should be
   re-tuned — requires a product/UX decision, explicitly out of Phase 16B scope.

---

## M. Files

Committed in this phase:

- `scripts/audit/phase16b-golden-harness.mjs` — reusable validation harness.
- `scripts/audit/phase16b-report.json` — machine-readable output.
- `scripts/audit/phase16b-final-report.md` — this report.
- `src/lib/career-matching/semantic-match.ts` — whole-word bug fix.
- `tests/career-matching-semantic.test.mjs` — new regression test T2b.

Deliberately **not** committed (Phase 22 probe/audit scripts, unrelated):
`scripts/audit-phase22-data-integrity.mjs`, `scripts/audit-phase22-institutions.mjs`,
`scripts/probe-golden-data.mjs`, `scripts/trace-golden-paths.mjs`.

---

## N. Reproduce

```bash
# 1. Run the reusable harness (seeds/tears-down transient data)
node --import ./scripts/register-loader.mjs scripts/audit/phase16b-golden-harness.mjs --out=scripts/audit/phase16b-report.json

# 2. Full suite
npm test
npx tsc --noEmit --skipLibCheck
npm run build   # note: set NODE_OPTIONS=--max-old-space-size=4096 on some machines
```

---

## O. Result summary

- The Phase 16B engine executed **without crashes** on all 23 personas, ranked
  deterministically (T34, DB8), and surfaced correct families for evidence-rich
  profiles.
- One **genuine engine bug** (sub-string concept collision falsely redirecting
  ~39 career traits onto `art`) was proven, fixed minimally, and locked with a
  regression test — measurably restoring arts/design profile quality.
- The dominant remaining quality limiters are **data-coverage gaps** (zero
  APTITUDE/WORK_ENVIRONMENT traits; missing interests/personality on 12
  careers; small families), **not** engine logic — documented here for a data
  phase to action.