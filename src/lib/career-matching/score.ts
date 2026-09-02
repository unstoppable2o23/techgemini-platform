import type {
  CareerCandidate,
  CareerMatch,
  CareerMatchInput,
  DimensionScore,
  MatchDimension,
  MatchEvidence,
  MatchReason,
  MatchStrength,
  MatchType,
} from "./types.ts";
import {
  DIMENSION_WEIGHTS,
  SOURCE_WEIGHTS,
  PREFERRED_CAREER_BOOST,
  MATCH_STRENGTH_THRESHOLDS,
  normalizeForMatch,
  SINGLE_SIGNAL_CONTROL,
  EDUCATION_SCORING,
  SPECIFICITY_CONFIG,
} from "./config.ts";
import { matchSignal, stripSignalPrefix } from "./semantic-match.ts";
import { computeConfidence } from "./confidence.ts";
import { buildExplanations } from "./explain.ts";
import {
  legacyPreferredReference,
  type PreferredCareerResolution,
} from "./preferred-career.ts";

const ALL_DIMENSIONS: MatchDimension[] = [
  "INTEREST",
  "PERSONALITY",
  "APTITUDE",
  "SUBJECT",
  "SKILL",
  "EDUCATION",
  "WORK_ENVIRONMENT",
];

/**
 * Builds the career-trait frequency map across a set of active careers.
 * For every normalized trait value a career declares (in any scored dimension),
 * counts how many distinct careers carry that trait. Used to derive a bounded
 * distinctiveness credit for ranking discrimination (see SPECIFICITY_CONFIG).
 * Deterministic: depends only on the supplied career set (the active catalog).
 */
export function buildTraitFrequency(
  careers: { traits: { dimension: string; value: string }[]; technicalSkills?: string[]; softSkills?: string[]; interests?: string[]; personalityTraits?: string[]; recommendedSubjects?: string[] }[]
): Map<string, number> {
  const freq = new Map<string, number>();
  for (const c of careers) {
    const seen = new Set<string>();
    const push = (value: string | undefined) => {
      if (!value) return;
      const n = normalizeForMatch(value);
      if (n && !seen.has(n)) { seen.add(n); freq.set(n, (freq.get(n) || 0) + 1); }
    };
    for (const t of c.traits || []) push(t.value);
    for (const s of c.technicalSkills || []) push(s);
    for (const s of c.softSkills || []) push(s);
    for (const i of c.interests || []) push(i);
    for (const p of c.personalityTraits || []) push(p);
    for (const s of c.recommendedSubjects || []) push(s);
  }
  return freq;
}

/**
 * Bounded distinctiveness multiplier for a career trait.
 *   baseline 1 for the most generic trait (present in every career).
 *   up to 1 + gain for the most distinctive trait (present in one career).
 * The number of active careers is passed in so the computation is exact and
 * independent of the caller's test catalog size.
 */
export function traitSpecificity(
  traitValue: string,
  frequency: Map<string, number> | undefined,
  activeCareerCount: number
): number {
  if (!SPECIFICITY_CONFIG.enabled || !frequency || activeCareerCount <= 1) return 1;
  const freq = frequency.get(normalizeForMatch(traitValue)) ?? 1;
  const rawness = 1 - Math.min(1, Math.max(0, freq / activeCareerCount));
  return 1 + SPECIFICITY_CONFIG.gain * rawness;
}

/**
 * Student's education stage, derived from signals. Used by the stage-aware
 * education evaluation so a school student is evaluated neutrally, not on
 * degrees they have not had a chance to earn.
 */
export type EducationStage = "SCHOOL" | "POST_SCHOOL" | "UNKNOWN";

type StudentValue = {
  value: string;
  stripped: string;
  norm: string;
  sigFactor: number;
  sourceType: string;
  score: number;
};

type MatchPoint = {
  dimension: MatchDimension;
  studentValue: string;
  careerTraitValue: string;
  strength: number;
  matchType: MatchType;
  sourceType: string;
};

/**
 * Phrase markers used by the content-based stage detection. Markers for a
 * *planned / future* qualification are ignored entirely: a student who says
 * they are "planning a B.Tech" is still a school student today and must not be
 * classified POST_SCHOOL from intent.
 */
const PLANNED_FUTURE_RE =
  /planning|planning to|aspiring|aspire|target|dream|wish|\bhop(e|es|ed|ing)\b|future|intend|intending|intends?|\bwant(s|ed|ing)?\b|going to|will (do|take|pursue)|aim(ing|s)?\s+to|pursu(e|ing)/i;
const POST_SCHOOL_RE =
  /undergraduate|postgraduate|post.secondary|\bbachelor|\bb\.?(tech|sc|s|a|com|eng|ba|bms|ca|pharm|ds|it|des|ed|mba)\b|\bm\.?(tech|sc|s|a|com|ba|ca|pharm)\b|\bmba\b|\bpgdm\b|\bmbbs\b|\bmd\b|\bms\b|\bllb\b|\bsem\b|\bca\b|\bcf[a-z]?\b|cma|master|doctoral|ph\.?d|\bgraduate\b|diploma|certificate|\bdegree\b|\buniversity\b|\bcollege\b/i;
const SCHOOL_CLASS_RE =
  /(^|\b)(class|grade|std|standard|year)\s*\.?\s*(\d{1,2})(\s*(th|rd|st|nd))?\b/i;
const SCHOOL_PHRASE_RE = /(^|\b)(high school|secondary school|higher secondary|middle school|primary school|elementary school|still in school)(\b|$)/i;

/**
 * Detects the student's education stage from the EDUCATION-dimension signals.
 * Content-based on the stripped value so that career-preference-prefixed
 * values and free-text study levels classify correctly. POST_SCHOOL wins over
 * SCHOOL when both appear (e.g. a completed "Grade 12 / High School" listed
 * alongside a current "Year 1 Undergraduate").
 */
export function detectEducationStage(signals: CareerMatchInput[]): EducationStage {
  let sawSchool = false;
  let sawPostSchool = false;
  for (const s of signals) {
    if (s.dimension !== "EDUCATION") continue;
    const raw = s.value.trim();
    const rawLower = raw.toLowerCase();
    const norm = normalizeForMatch(stripSignalPrefix(raw));
    if (!norm || PLANNED_FUTURE_RE.test(norm)) continue;

    if (POST_SCHOOL_RE.test(norm)) {
      sawPostSchool = true;
      continue;
    }
    if (SCHOOL_CLASS_RE.test(norm) || SCHOOL_PHRASE_RE.test(norm)) {
      sawSchool = true;
      continue;
    }

    // No explicit content marker. Fall back to prefix semantics: a factual
    // current/highest study level is post-school by nature (a stated present
    // state, not intent); grade_level always denotes schooling.
    if (rawLower.startsWith("grade_level")) {
      sawSchool = true;
    } else if (rawLower.startsWith("study_level") || rawLower.startsWith("highest_education")) {
      sawPostSchool = true;
    }
  }
  if (sawPostSchool) return "POST_SCHOOL";
  if (sawSchool) return "SCHOOL";
  return "UNKNOWN";
}

/**
 * Deduplicates student signals per dimension on the stripped normalized value.
 * Keeps the representation with the highest effective strength so repeated
 * evidence (same fact from multiple sources) cannot multiply a dimension score.
 */
function uniqueStudentValues(
  signals: CareerMatchInput[],
  dimension: MatchDimension
): StudentValue[] {
  const byNorm = new Map<string, StudentValue>();
  for (const s of signals) {
    if (s.dimension !== dimension) continue;
    const stripped = stripSignalPrefix(s.value);
    const norm = normalizeForMatch(stripped);
    if (!norm) continue;
    const sigFactor =
      (Math.max(0, Math.min(100, s.score)) / 100) * (SOURCE_WEIGHTS[s.sourceType] ?? 0.5);
    const existing = byNorm.get(norm);
    if (!existing || sigFactor > existing.sigFactor) {
      byNorm.set(norm, {
        value: s.value,
        stripped,
        norm,
        sigFactor,
        sourceType: s.sourceType,
        score: s.score,
      });
    }
  }
  return [...byNorm.values()].sort((a, b) => {
    if (b.sigFactor !== a.sigFactor) return b.sigFactor - a.sigFactor;
    return a.norm.localeCompare(b.norm);
  });
}

/**
 * Scores one non-education dimension.
 * Travelling trait-first, with per-student-value credit capped so a single
 * fact cannot dominate many traits (single-signal domination control).
 */
function scoreStandardDimension(
  dimension: MatchDimension,
  values: StudentValue[],
  traits: { value: string; weight: number }[]
): {
  score: number;
  matchedCount: number;
  matchedValues: string[];
  unmatchedTraitValues: string[];
  evidence: MatchPoint[];
} {
  // Best student value for each career trait (deterministic: values sorted by
  // strength desc, trait order preserved).
  const perTrait = new Map<
    string,
    { value: StudentValue; strength: number; matchType: MatchType }
  >();
  for (const trait of traits) {
    let best: { value: StudentValue; strength: number; matchType: MatchType } | null = null;
    for (const value of values) {
      const m = matchSignal(value.value, [{ value: trait.value, weight: trait.weight }]);
      if (m.matched && (!best || m.strength > best.strength)) {
        best = { value, strength: m.strength, matchType: m.matchType };
      }
    }
    if (best) perTrait.set(trait.value, best);
  }

  let numerator = 0;
  let denominator = 0;
  const claimedByValue = new Map<string, boolean>(); // normalized student value
  const evidence: MatchPoint[] = [];

  for (const trait of traits) {
    const hit = perTrait.get(trait.value);
    if (!hit) continue;
    const firstClaim = !claimedByValue.has(hit.value.norm);
    claimedByValue.set(hit.value.norm, true);
    const credit = firstClaim
      ? hit.strength
      : hit.strength * SINGLE_SIGNAL_CONTROL.extraTraitMatchDiscount;
    numerator += trait.weight * credit * hit.value.sigFactor;
    denominator += trait.weight;
    evidence.push({
      dimension,
      studentValue: hit.value.value,
      careerTraitValue: trait.value,
      strength: hit.strength,
      matchType: hit.matchType,
      sourceType: hit.value.sourceType,
    });
  }

  const score =
    denominator > 0 && numerator > 0
      ? Math.min(100, Math.round((numerator / denominator) * 100))
      : 0;

  return {
    score,
    matchedCount: perTrait.size,
    matchedValues: [...new Set(evidence.map((e) => e.studentValue))],
    unmatchedTraitValues: traits.filter((t) => !perTrait.has(t.value)).map((t) => t.value),
    evidence,
  };
}

function careerDegreeTraits(career: CareerCandidate): { value: string; weight: number }[] {
  const out: { value: string; weight: number }[] = [];
  const seen = new Set<string>();
  const add = (value: string, weight: number) => {
    const norm = normalizeForMatch(value);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push({ value, weight });
  };
  for (const d of career.recommendedDegrees || []) add(d, 0.5);
  for (const p of career.educationPaths || []) {
    if (p.degreeName) add(p.degreeName, 0.6);
  }
  return out;
}

type EducationResult = {
  dimensionScore: DimensionScore;
  includeInScore: boolean;
  reasons: MatchReason[];
  evidence: MatchPoint[];
};

function scoreEducation(
  career: CareerCandidate,
  educationValues: StudentValue[],
  stage: EducationStage
): EducationResult {
  const degreeTraits = careerDegreeTraits(career);
  const unmatched = degreeTraits.map((t) => t.value);

  if (stage === "SCHOOL") {
    // School students have had no chance to earn degrees, so school-stage
    // education evidence is neutral: it never inflates the score (no generic
    // baseline) and never penalises. Future plausibility is carried by other
    // dimensions such as SUBJECT, never double-counted here.
    return {
      dimensionScore: {
        dimension: "EDUCATION",
        score: 0,
        matchedCount: 0,
        totalTraits: degreeTraits.length,
        matchedValues: [],
        unmatchedTraitValues: unmatched,
      },
      includeInScore: false,
      reasons: [],
      evidence: [],
    };
  }

  if (stage === "POST_SCHOOL") {
    const perTrait = new Map<
      string,
      { value: StudentValue; strength: number; matchType: MatchType }
    >();
    for (const trait of degreeTraits) {
      let best: { value: StudentValue; strength: number; matchType: MatchType } | null = null;
      for (const value of educationValues) {
        const m = matchSignal(value.value, [{ value: trait.value, weight: trait.weight }]);
        if (m.matched && (!best || m.strength > best.strength)) {
          best = { value, strength: m.strength, matchType: m.matchType };
        }
      }
      if (best) perTrait.set(trait.value, best);
    }

    const evidence: MatchPoint[] = [...perTrait.entries()].map(([traitValue, hit]) => ({
      dimension: "EDUCATION",
      studentValue: hit.value.value,
      careerTraitValue: traitValue,
      strength: hit.strength,
      matchType: hit.matchType,
      sourceType: hit.value.sourceType,
    }));

    if (perTrait.size > 0) {
      return {
        dimensionScore: {
          dimension: "EDUCATION",
          score: EDUCATION_SCORING.postSchoolAligned,
          matchedCount: perTrait.size,
          totalTraits: degreeTraits.length,
          matchedValues: evidence.map((e) => e.studentValue),
          unmatchedTraitValues: degreeTraits.filter((t) => !perTrait.has(t.value)).map((t) => t.value),
        },
        includeInScore: true,
        reasons: [
          {
            type: "strength",
            dimension: "EDUCATION",
            text: `Your current qualifications align with the typical education path for this career (${perTrait.size} degree${perTrait.size === 1 ? "" : "s"} related to this path).`,
          },
        ],
        evidence,
      };
    }

    // No alignment: not a verified gap (students switch tracks), so a soft,
    // non-penalising baseline with an honest explanation.
    return {
      dimensionScore: {
        dimension: "EDUCATION",
        score: EDUCATION_SCORING.postSchoolNeutral,
        matchedCount: 0,
        totalTraits: degreeTraits.length,
        matchedValues: [],
        unmatchedTraitValues: unmatched,
      },
      includeInScore: true,
      reasons: [
        {
          type: "development_area",
          dimension: "EDUCATION",
          text: "education alignment for this career is not yet confirmed from your current stage — you can still build toward it.",
          evidenceType: "DEVELOPMENT_AREA",
        },
      ],
      evidence: [],
    };
  }

  // UNKNOWN stage: no education evidence at all.
  return {
    dimensionScore: {
      dimension: "EDUCATION",
      score: 0,
      matchedCount: 0,
      totalTraits: degreeTraits.length,
      matchedValues: [],
      unmatchedTraitValues: unmatched,
    },
    includeInScore: false,
    reasons:
      degreeTraits.length > 0
        ? [
            {
              type: "missing_evidence",
              dimension: "EDUCATION",
              text: `No education or study-level data available yet`,
              evidenceType: "MISSING_EVIDENCE",
            },
          ]
        : [],
    evidence: [],
  };
}

function applyPreferredBoost(
  career: CareerCandidate,
  preferred: PreferredCareerResolution
): { boosted: number; preferenceBoost: boolean } {
  if (preferred.resolved && preferred.careerId) {
    if (preferred.careerId === career.id) {
      return { boosted: PREFERRED_CAREER_BOOST, preferenceBoost: true };
    }
    // Canonical preference resolved to a different career: respect it, do not
    // guess via text matching.
    return { boosted: 0, preferenceBoost: false };
  }

  if (!preferred.fallbackAllowed || !preferred.careerName) {
    return { boosted: 0, preferenceBoost: false };
  }

  const normalizedPreferred = normalizeForMatch(preferred.careerName);
  if (!normalizedPreferred) return { boosted: 0, preferenceBoost: false };

  // Very conservative legacy fallback: exact name or exact title equality only.
  // No substring/containment and no category matching — a preferred "AI" must
  // not half-boost every career whose name or category merely contains "AI".
  const exactName = normalizeForMatch(career.name) === normalizedPreferred;
  const exactTitle =
    Boolean(career.title) && normalizeForMatch(career.title) === normalizedPreferred;
  if (exactName || exactTitle) {
    return { boosted: PREFERRED_CAREER_BOOST, preferenceBoost: true };
  }
  return { boosted: 0, preferenceBoost: false };
}

/**
 * Pure scoring function: given a career and the student's normalized signals,
 * returns a deterministic match result. No database connection required.
 *
 * The third argument accepts either a resolved preferred-career reference
 * (canonical id resolution) or a legacy free-text string for back-compat.
 */
export function scoreCareer(
  career: CareerCandidate,
  studentSignals: CareerMatchInput[],
  preferred: string | null | PreferredCareerResolution = null
): CareerMatch {
  // ---- student evidence, grouped by dimension ----
  const valuesByDim = new Map<MatchDimension, StudentValue[]>();
  for (const dim of ALL_DIMENSIONS) {
    valuesByDim.set(dim, uniqueStudentValues(studentSignals, dim));
  }
  const studentDimensions = new Set(studentSignals.map((s) => s.dimension));
  const hasNonEducationEvidence = studentSignals.some((s) => s.dimension !== "EDUCATION");

  // ---- career traits per dimension (explicit + career-field mapping) ----
  const traitsByDim = new Map<MatchDimension, { value: string; weight: number }[]>();
  const addTrait = (dimension: MatchDimension, value: string, weight: number) => {
    if (!value?.trim()) return;
    const list = traitsByDim.get(dimension) || [];
    const norm = normalizeForMatch(value);
    if (norm && !list.some((existing) => normalizeForMatch(existing.value) === norm)) {
      list.push({ value, weight });
    }
    traitsByDim.set(dimension, list);
  };

  for (const trait of career.traits) addTrait(trait.dimension, trait.value, trait.weight);
  for (const s of career.technicalSkills) addTrait("SKILL", s, 0.8);
  for (const s of career.softSkills) addTrait("SKILL", s, 0.6);
  for (const i of career.interests) addTrait("INTEREST", i, 0.8);
  for (const p of career.personalityTraits) addTrait("PERSONALITY", p, 0.8);
  for (const s of career.recommendedSubjects) addTrait("SUBJECT", s, 0.8);

  const stage = detectEducationStage(studentSignals);

  // ---- score each dimension ----
  const dimensionScores: DimensionScore[] = [];
  const evidence: MatchEvidence[] = [];
  let weightedSum = 0;
  let weightSum = 0;
  let supportedDimensions = 0;
  let eduIncluded = false;
  let educationReasons: MatchReason[] = [];

  for (const dim of ALL_DIMENSIONS) {
    const weight = DIMENSION_WEIGHTS[dim];
    const traits = traitsByDim.get(dim) || [];

    if (dim === "EDUCATION") {
      const edu = scoreEducation(career, valuesByDim.get("EDUCATION") || [], stage);
      dimensionScores.push(edu.dimensionScore);
      evidence.push(...edu.evidence);
      educationReasons = edu.reasons;
      const contributes =
        edu.includeInScore &&
        (edu.dimensionScore.matchedCount > 0 || hasNonEducationEvidence);
      if (contributes) {
        weightedSum += edu.dimensionScore.score * weight;
        weightSum += weight;
        supportedDimensions += 1;
        eduIncluded = true;
      }
      continue;
    }

    const result = scoreStandardDimension(dim, valuesByDim.get(dim) || [], traits);
    dimensionScores.push({
      dimension: dim,
      score: result.score,
      matchedCount: result.matchedCount,
      totalTraits: traits.length,
      matchedValues: result.matchedValues,
      unmatchedTraitValues: result.unmatchedTraitValues,
    });
    evidence.push(...result.evidence);

    if (result.matchedCount > 0) {
      weightedSum += result.score * weight;
      weightSum += weight;
      supportedDimensions += 1;
    }
  }

  // ---- base score with single-signal breadth control ----
  let matchScore = 0;
  if (weightSum > 0) {
    const raw = weightedSum / weightSum;
    const breadth = Math.min(
      SINGLE_SIGNAL_CONTROL.maxBreadth,
      SINGLE_SIGNAL_CONTROL.breadthBase +
        SINGLE_SIGNAL_CONTROL.breadthPerDimension * supportedDimensions
    );
    matchScore = Math.round(raw * breadth);
  }

  // ---- preferred career ------------
  const pref: PreferredCareerResolution =
    typeof preferred === "string" || preferred === null
      ? legacyPreferredReference(preferred)
      : preferred;
  const { boosted, preferenceBoost } = applyPreferredBoost(career, pref);
  matchScore = Math.max(0, Math.min(100, matchScore + boosted));

  // ---- confidence ----
  const matchedDistinct = new Set<string>();
  for (const e of evidence) matchedDistinct.add(normalizeForMatch(stripSignalPrefix(e.studentValue)));
  const matchedSignals = matchedDistinct.size;
  const dimensionsMatched = new Set(evidence.map((e) => e.dimension)).size;
  const careerTraitDimensions = [...traitsByDim.keys()].filter(
    (d) => (traitsByDim.get(d)?.length || 0) > 0
  ).length;
  const sourceTypes = new Set(studentSignals.map((s) => s.sourceType));
  const assessmentEvidence = evidence.some((e) => e.sourceType === "ASSESSMENT");
  const singlePreferenceSignal =
    evidence.length >= 1 &&
    matchedSignals <= 1 &&
    evidence.every((e) => e.sourceType === "PREFERENCE");

  const confidence = computeConfidence({
    matchedSignals,
    dimensionsMatched,
    careerTraitDimensions,
    sourceTypeCount: sourceTypes.size,
    assessmentEvidence,
    singlePreferenceSignal,
    anyMatch: evidence.length > 0,
  });

  // ---- match strength ----
  let matchStrength: MatchStrength = "missing_evidence";
  if (matchScore >= MATCH_STRENGTH_THRESHOLDS.strong) matchStrength = "strong";
  else if (matchScore >= MATCH_STRENGTH_THRESHOLDS.moderate) matchStrength = "moderate";
  else if (matchScore >= MATCH_STRENGTH_THRESHOLDS.weak) matchStrength = "weak";
  else if (evidence.length > 0) matchStrength = "development_area";

  // ---- explanations ----
  // Reliable conflict evidence: a dimension counts as a potential VERIFIED_GAP
  // only when the student has reliable evidence in it (assessment-derived with
  // a strong score, or a very strong general score) AND the dimension produced
  // zero meaningful alignment (matchedCount === 0, enforced in explain.ts).
  // Reliability is judged on the deduplicated per-concept representation so
  // that one concept reported through several weak aliases cannot be mistaken
  // for strong conflict evidence.
  const verifiedGapDimensions = new Set<MatchDimension>();
  for (const dim of ALL_DIMENSIONS) {
    if (dim === "EDUCATION") continue;
    const values = valuesByDim.get(dim) || [];
    const reliable = values.some((v) => (v.sourceType === "ASSESSMENT" && v.score >= 60) || v.score >= 85);
    if (reliable) verifiedGapDimensions.add(dim);
  }
  const explanation = buildExplanations({
    dimensionScores,
    studentDimensions,
    verifiedGapDimensions,
    preferenceBoost,
    educationReasons,
  });

  // ---- source summary ----
  const sourceSummary = [...sourceTypes].map((s) => {
    switch (s) {
      case "ASSESSMENT": return "Psychometric assessment";
      case "STUDENT_PROFILE": return "Student profile";
      case "ACADEMIC": return "Academic information";
      case "PREFERENCE": return "Personal preferences";
      case "MANUAL": return "Manual entry";
      default: return s;
    }
  });

  // ---- trace ----
  const matchTypes: MatchType[] = [...new Set(evidence.map((e) => e.matchType))];
  const supportedDims: { dimension: MatchDimension; score: number; matchedCount: number }[] = [];
  const weakDims: { dimension: MatchDimension; score: number; matchedCount: number }[] = [];
  const unsupportedDims: MatchDimension[] = [];
  for (const ds of dimensionScores) {
    const isEduIncluded = ds.dimension === "EDUCATION" && eduIncluded;
    if (ds.matchedCount > 0 || isEduIncluded) {
      supportedDims.push({ dimension: ds.dimension, score: ds.score, matchedCount: ds.matchedCount });
    }
    if (ds.matchedCount > 0 && ds.score > 0 && ds.score < 50) {
      weakDims.push({ dimension: ds.dimension, score: ds.score, matchedCount: ds.matchedCount });
    }
    if (ds.totalTraits > 0 && ds.matchedCount === 0) {
      unsupportedDims.push(ds.dimension);
    }
  }

  const trace = {
    careerId: career.id,
    totalScore: matchScore,
    confidence: confidence.score,
    supportedDimensions: supportedDims,
    weakDimensions: weakDims,
    unsupportedDimensions: unsupportedDims,
    matchedSignals,
    matchTypes,
    preferredCareerMatch: preferenceBoost,
    preferredCareerSource: pref.source,
  };

  return {
    careerId: career.id,
    career: {
      id: career.id,
      name: career.name,
      slug: career.slug,
      title: career.title,
      category: career.category,
      shortDescription: career.shortDescription,
      demandLevel: career.demandLevel,
      salaryEntry: career.salaryEntry,
      isEmerging: career.isEmerging,
    },
    matchScore,
    confidenceScore: Math.round(confidence.score * 100),
    matchStrength,
    dimensionScores,
    strengths: explanation.strengths,
    developmentAreas: explanation.developmentAreas,
    missingEvidence: explanation.missingEvidence,
    verifiedGaps: explanation.verifiedGaps,
    reasons: explanation.reasons,
    sourceSummary,
    preferenceBoost,
    evidence,
    matchTypes,
    confidenceDetail: confidence,
    supportedDimensions,
    trace,
  };
}

/**
 * Average bounded distinctiveness of the career traits a match actually hit.
 * Higher = the student matched more distinctive (less generic) career traits,
 * which is a legitimate tie-break for ranks, NOT a score adjustment.
 */
function matchDistinctiveness(
  match: CareerMatch,
  frequency: Map<string, number> | undefined,
  activeCareerCount: number
): number {
  if (!frequency || activeCareerCount <= 1) return 0;
  const values = match.evidence.map((e) => e.careerTraitValue).filter(Boolean);
  if (!values.length) return 0;
  const total = values.reduce(
    (a, v) => a + traitSpecificity(v, frequency, activeCareerCount),
    0
  );
  return total / values.length;
}

type RankContext = { traitFrequency?: Map<string, number>; activeCareerCount?: number };

function baseRankCompare(a: CareerMatch, b: CareerMatch): number {
  if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
  if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
  if (b.supportedDimensions !== a.supportedDimensions) {
    return b.supportedDimensions - a.supportedDimensions;
  }
  const byName = a.career.name.localeCompare(b.career.name);
  if (byName !== 0) return byName;
  return a.careerId.localeCompare(b.careerId);
}

/**
 * Ranks scored careers deterministically and transitively.
 *
 * Ordering, from most to least significant:
 *   1. matchScore desc
 *   2. confidenceScore desc
 *   3. supportedDimensions desc
 *   4. career name asc, then career id asc
 *
 * Phase 16D within-family differentiation: careers can reach the same score on
 * the same evidence (generic traits like "Mathematics" appear in ~47% of the
 * catalog), collapsing closely-related careers into exact ties. To restore a
 * deterministic, useful order WITHOUT reordering careers across families (which
 * would reduce family diversity in the top-N), careers that are tied on every
 * non-name key (score, confidence, dimensions) AND share a category are grouped
 * together: inside a group the more distinctive matched evidence ranks first,
 * while groups themselves keep the global base order above. Real
 * distinctiveness only ever breaks ties between same-category careers that are
 * otherwise indistinguishable; it never competes with confidence or dimensions.
 *
 * This is implemented as a two-pass stable grouping sort, NOT a conditional
 * comparator, so the result is a valid strict weak ordering.
 *
 * `context` is optional. When omitted (pure unit tests), the order reduces to
 * score -> confidence -> dimensions -> name -> id, preserving legacy behavior.
 */
export function rankMatches(
  matches: CareerMatch[],
  context?: RankContext
): CareerMatch[] {
  const freq = context?.traitFrequency;
  const count = context?.activeCareerCount ?? 0;
  const distinctiveness = (m: CareerMatch) =>
    count > 1 ? matchDistinctiveness(m, freq, count) : 0;

  // Pass 1: global base order (score -> confidence -> dims -> name -> id).
  const base = [...matches].sort(baseRankCompare);
  if (!base.length) return base;

  // Pass 2: stable grouping. A "run" is a maximal consecutive sequence of
  // careers sharing the same (matchScore, confidenceScore, supportedDimensions,
  // career.category) in the base order — careers tied on every non-name key.
  // Because the base order sorts by confidence then dimensions, identical-key
  // careers are exactly the evidence-collision class. Within each run, more
  // distinctive matched evidence ranks first, and equal distinctiveness keeps
  // the base order. Runs are non-overlapping, so careers that differ on score,
  // confidence, dimensions, or category are never reordered relative to one
  // another, and the result is a valid strict weak ordering.
  const grouped: CareerMatch[] = [];
  let runStart = 0;
  const sameRunKey = (a: CareerMatch, b: CareerMatch) =>
    a.matchScore === b.matchScore &&
    a.confidenceScore === b.confidenceScore &&
    a.supportedDimensions === b.supportedDimensions &&
    a.career.category === b.career.category;
  for (let i = 1; i <= base.length; i++) {
    if (i < base.length && sameRunKey(base[runStart], base[i])) continue;
    const run = base.slice(runStart, i);
    if (run.length > 1) {
      run.sort((a, b) => {
        const d = distinctiveness(b) - distinctiveness(a);
        if (d !== 0) return d;
        return baseRankCompare(a, b);
      });
    }
    grouped.push(...run);
    runStart = i;
  }
  return grouped;
}