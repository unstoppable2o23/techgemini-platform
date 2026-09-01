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
 * Student's education stage, derived from signals. Used by the stage-aware
 * education evaluation so a school student is judged on future plausibility,
 * not on degrees they have not had a chance to earn.
 */
type EducationStage = "SCHOOL" | "POST_SCHOOL" | "UNKNOWN";

type StudentValue = {
  value: string;
  stripped: string;
  norm: string;
  sigFactor: number;
  sourceType: string;
};

type MatchPoint = {
  dimension: MatchDimension;
  studentValue: string;
  careerTraitValue: string;
  strength: number;
  matchType: MatchType;
  sourceType: string;
};

function determineEducationStage(signals: CareerMatchInput[]): EducationStage {
  for (const s of signals) {
    if (s.dimension !== "EDUCATION") continue;
    const lower = s.value.toLowerCase();
    if (lower.startsWith("grade_level:")) return "SCHOOL";
    if (lower.startsWith("study_level:") || lower.startsWith("highest_education:")) {
      return "POST_SCHOOL";
    }
  }
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
      byNorm.set(norm, { value: s.value, stripped, norm, sigFactor, sourceType: s.sourceType });
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
  const hasDegreeInfo = degreeTraits.length > 0 || Boolean(career.minStudyLevel);
  const unmatched = degreeTraits.map((t) => t.value);

  if (stage === "SCHOOL") {
    if (!hasDegreeInfo) {
      return {
        dimensionScore: { dimension: "EDUCATION", score: 0, matchedCount: 0, totalTraits: degreeTraits.length, matchedValues: [], unmatchedTraitValues: unmatched },
        includeInScore: false,
        reasons: [],
        evidence: [],
      };
    }
    return {
      dimensionScore: {
        dimension: "EDUCATION",
        score: EDUCATION_SCORING.schoolBaseline,
        matchedCount: 0,
        totalTraits: degreeTraits.length,
        matchedValues: [],
        unmatchedTraitValues: unmatched,
      },
      includeInScore: true,
      reasons: [
        {
          type: "strength",
          dimension: "EDUCATION",
          text: "This career is educationally plausible from your current stage — the required degree is typically a future step, not a current gap.",
        },
      ],
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

  const normalizedCareerName = normalizeForMatch(career.name);
  const normalizedCareerTitle = normalizeForMatch(career.title);
  const normalizedCategory = normalizeForMatch(career.category || "");

  if (
    normalizedCareerName === normalizedPreferred ||
    normalizedCareerTitle === normalizedPreferred ||
    normalizedCareerName.includes(normalizedPreferred) ||
    normalizedPreferred.includes(normalizedCareerName)
  ) {
    return { boosted: PREFERRED_CAREER_BOOST, preferenceBoost: true };
  }
  if (
    normalizedCategory.includes(normalizedPreferred) ||
    normalizedPreferred.includes(normalizedCategory)
  ) {
    return { boosted: Math.round(PREFERRED_CAREER_BOOST / 2), preferenceBoost: true };
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

  const stage = determineEducationStage(studentSignals);

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
  // Reliable conflict evidence: signals in a dimension that did not align are
  // treated as a verified gap only when the evidence itself is reliable
  // (assessment-derived with a strong score, or a very strong general score).
  const verifiedGapDimensions = new Set<MatchDimension>();
  for (const s of studentSignals) {
    if (s.dimension === "EDUCATION") continue;
    const reliable = (s.sourceType === "ASSESSMENT" && s.score >= 60) || s.score >= 85;
    if (reliable) verifiedGapDimensions.add(s.dimension);
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
 * Ranks scored careers deterministically.
 * Primary: matchScore desc
 * Secondary: confidenceScore desc
 * Tertiary: matched dimension count desc (breadth of evidence)
 * Final: career name asc, then career id asc
 */
export function rankMatches(matches: CareerMatch[]): CareerMatch[] {
  return [...matches].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    if (b.supportedDimensions !== a.supportedDimensions) {
      return b.supportedDimensions - a.supportedDimensions;
    }
    const byName = a.career.name.localeCompare(b.career.name);
    if (byName !== 0) return byName;
    return a.careerId.localeCompare(b.careerId);
  });
}