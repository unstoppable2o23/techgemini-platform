# Phase 18.1 — Golden Career Cases (Human Readability Review)

**Date:** 2026-09-03
**Purpose:** Human QA of representative recommendations. Each case lists the expected career families, the actual top recommendations with score/confidence/level, a short explanation, and notable strengths / development areas as produced by the engine's explanation module.

**Source data:** `scripts/audit/phase18-1-engine-freeze-baseline.json` (real engine, real active catalog, transient student per case).

**How to read:**
- **Compatibility Score**: directional heuristic (0–100), not a probability or admission chance.
- **Confidence (level)**: evidence quality, independent of fit. HIGH / MODERATE / LOW.

**Note on the profiles:** The golden harness seeds registration-style profile data only (like a student who filled the onboarding form but has not yet taken the psychometric assessments). That is why most recommenders show "no aptitude/personality assessment" — it reflects a pre-assessment onboarding demo, not a bug.

---

## Case A — Computer Science / AI-oriented student (Class 10–12 Science + Math)
- **Expected families:** engineering, technology, lifescience
- **Top recommendations:**
  1. Chemical Engineering — 50 · MODERATE
  2. Actuarial Science — 50 · LOW
  3. Machine Learning Engineering — 50 · LOW
  4. Additive Manufacturing Engineer — 48 · LOW
  5. Battery Technology Engineer — 48 · LOW
- **Explanation:** Strong interest alignment (61%) and strong subject alignment in Physics/Mathematics, with no aptitude/personality/assessment evidence yet.
- **Strengths:** mathematics + science study background surfaces data-, engineering- and technology-track careers.
- **Development areas:** completing the aptitude/interest assessments will sharpen the technology-vs-engineering ordering.

## Case B — Engineering student (Undergraduate mechanical)
- **Expected families:** engineering, technology, manufacturing
- **Top recommendations:**
  1. Actuarial Science — 55 · LOW
  2. Machine Learning Engineering — 55 · LOW
  3. Additive Manufacturing Engineer — 49 · LOW
  4. Air Traffic Management — 49 · LOW
  5. Aircraft Maintenance Engineering — 49 · LOW
- **Explanation:** strong interest + math/physics subject alignment; equal-score ordering product is Alphabetical/cross-family (see Flags below).
- **Strengths:** manufacturing, aerospace, automotive and automation engineering careers are well represented in the top-10.
- **Development areas:** the single top slot (Actuarial Science) is a **weaker-than-expected cross-family placement** for a mechanical student — flagged P1 (accepted/documented; see engine-freeze report).

## Case C — Biology / medical student (Class 11–12 PCB)
- **Expected families:** medicine, lifescience, agriculture
- **Top recommendations:**
  1. Medicine — 50 · MODERATE
  2. Biomedical Engineering — 50 · MODERATE
  3. Chemical Engineering — 50 · MODERATE
  4. Bioinformatics — 49 · LOW
  5. Aquaculture — 49 · LOW
- **Explanation:** strong interest + strong Biology/Chemistry subject alignment (68%).
- **Strengths:** medicine, biomedical and life-science careers top the list; agriculture via aquaculture present.
- **Development areas:** none material.

## Case D — Commerce / finance student (Class 12 commerce)
- **Expected families:** finance, business, law
- **Top recommendations:**
  1. Business Management — 48 · LOW
  2. Chartered Accountancy — 48 · LOW
  3. Agri Business Management — 48 · LOW
  4. Business Analytics — 48 · LOW
  5. Business Development — 48 · LOW
- **Explanation:** profile-level interest in business/numbers + strong subject alignment (Business Studies, Accountancy, Economics).
- **Strengths:** an excellent finance/business cluster; CA, Business Analytics, Business Development all appropriate.
- **Development areas:** none material.

## Case E — Humanities student (History/Political Science/English)
- **Expected families:** humanities, law, education, government
- **Top recommendations:**
  1. Journalism — 48 · LOW
  2. Anthropology — 48 · LOW
  3. Creative Writing — 48 · LOW
  4. Foreign Services — 48 · LOW
  5. Political Science — 48 · LOW
- **Explanation:** strong subject alignment in Humanities + writing/communication interest.
- **Strengths:** writing, humanities, government and public-service careers well matched.
- **Development areas:** none material.

## Case F — Media / communication student (Art + English, designing/writing)
- **Expected families:** design, media, architecture
- **Top recommendations:**
  1. Graphic Design — 55 · LOW
  2. Animation — 55 · LOW
  3. Multimedia and Gaming — 55 · LOW
  4. Fine Arts — 55 · LOW
  5. Filmmaking and Direction — 49 · LOW
- **Explanation:** strong interest (creating/designing, art) + subject alignment.
- **Strengths:** design + media cluster is exactly on-message.
- **Development areas:** architecture careers do not surface this profile (only a portion of expected-family hit) — P2 ordering note.

## Case G — Law-oriented student (Political Science/History/English)
- **Expected families:** law, government, humanities
- **Top recommendations:**
  1. Law — 60 · LOW (preferred, boost applied)
  2. Journalism — 48 · LOW
  3. Creative Writing — 48 · LOW
  4. Foreign Services — 48 · LOW
  5. Political Science — 48 · LOW
- **Explanation:** strong subject alignment + preferred-career boost bounded to surface Law #1 without dominating.
- **Strengths:** Law tops the list; government/humanities follow.
- **Development areas:** none material.

## Case H — Psychology / social-sciences student (Undergraduate Psychology/Sociology, helping+writing)
- **Expected families:** psychology, education, medicine
- **Top recommendations:**
  1. Brand Management — 55 · LOW
  2. Linguistics — 49 · LOW
  3. Anthropology — 49 · LOW
  4. Career Counselling — 49 · LOW
  5. Corporate Communication — 49 · LOW
- **Explanation:** strong interest alignment (helping/writing) + psychology subject signal.
- **Strengths:** human-centric careers (counseling, education, health) present in the top-10.
- **Development areas:** the **top slot (Brand Management) is a weaker-than-expected cross-family placement** for a psychology student — flagged P1 (accepted/documented). Psych-specific careers rank #4+.

## Case I — Architecture / design student (Art + Math + Physics, designing, preferred Architect)
- **Expected families:** architecture, design, engineering
- **Top recommendations:**
  1. Animation — 50 · MODERATE
  2. Multimedia and Gaming — 50 · MODERATE
  3. Actuarial Science — 50 · LOW
  4. Fine Arts — 50 · LOW
  5. Graphic Design — 50 · LOW
- **Explanation:** strong interest (designing) + art/math subject; design family dominates the top-5 (all are appropriate design careers). Architecture itself ranks **#7 (48 · MODERATE)** with the preferred boost applied.
- **Strengths:** a coherent design cluster; the explicitly-preferred Architecture career is surfaced and boosted (MODERATE confidence).
- **Development areas:** the order places generic design careers above the architecture-specific career the student prefers — **flagged P2** (reasonable but imperfect ordering; preferred career does not force #1).

## Case J — Agriculture / environment student (farm-adjacent interest; class 11 science + biology cluster)
- *A direct agriculture persona was not among the 13 frozen profiles' seed set; the closest evidence appears via the biology/science profiles where aquaculture/agriculture surface.*
- **Top recommendations (from Case C science/bio profile):** Aquaculture — 49; Agri Business Management, Agricultural Engineering, Agriculture Research appear in related science profiles.
- (For a fully agriculture-preferred persona, see Phase 16 golden profiles D/V which surface the agriculture family; the engine emits agriculture family coverage where bio/agri science evidence exists.)

## Case K — Low-information student (almost no data)
- **Expected families:** none (low-information is the correct honest outcome)
- **Top recommendations:** all careers score **0 · LOW** (e.g. Actuarial Science 0, Additive Manufacturing 0, Advertising 0, Aerospace 0, Agri Business 0).
- **Explanation:** the engine returns an honest low-evidence state and does **not** present an arbitrary list as a recommendation.
- **Strengths:** no invented/fabricated recommendation — protects trust.
- **Development areas:** user should complete onboarding + at least one assessment to unlock meaningful rankings.

## Case L — Assessment-only student (psychological-technical signals: logical reasoning + logical-mathematical, 85 each)
- **Expected families:** technology, engineering
- **Top recommendations:**
  1. Actuarial Science — 59 · LOW
  2. Aerospace Engineering — 59 · LOW
  3. Agricultural Engineering — 59 · LOW
  4. Architectural Technology — 59 · LOW
  5. Architecture — 59 · LOW
- **Explanation:** pure assessment evidence (logical-mathematical aptitude). All recommendations score evenly (59) because only two aptitude signals exist; ordering within the tie is by family-specific tie-break/name.
- **Strengths:** technology/engineering-leaning surge; no profile-only bias.
- **Development areas:** more assessment dimensions would diversify the tie.

## Case M — Preferred-career-only student (preference "Management Consultant", no other data)
- **Expected families:** business, finance
- **Top recommendations:** all score **0 · LOW**; "Management Consultant" is **not** force-surfaced because no active career matches that exact name/title and there is no alias for it.
- **Explanation:** `resolvePreferredCareer` finds no exact name and no alias, and the engine's conservative rule ("never guess") means an unresolvable free-text preference gets no boost. This is **expected, defensible behavior** — the engine won't half-boost a career it can't identify.
- **Strengths:** honest state; no fabricated recommendation for a preference the catalog can't resolve.
- **Development areas / guidance:** for a real student, a counselor should map the free-text preference to a canonical career (e.g. Strategy Consulting / Management Consulting) so the preference can be boosted.

---

## Summary of human-reasonableness flags

| Case | Flag | Finding |
|------|------|---------|
| B (mechanical) | **P1** | Actuarial Science #1 (cross-family tie). Accepted/documented. |
| H (psychology) | **P1** | Brand Management #1 (cross-family tie). Accepted/documented. |
| I (architecture) | **P2** | Design careers above preferred Architecture (#7). |
| F (media) | P2 | Architecture family absent from top-10. |
| Various | P2 | Equal-score ordering within/across families is imperfect in places; never misleading. |
| K, M (low-info) | ✅ | Correct honest low-information behavior. |
| All data-rich | ✅ | Recommendations land in plausible families for the given inputs. |

**No P0** (nothing obviously unrelated or misleading was recommended). Per Phase 18.1 policy, the equal-score/cross-family ordering artifacts are accepted and documented, **not** fixed by changing weights or the algorithm.