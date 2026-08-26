import type {
  CareerCandidate,
  CareerMatch,
  CareerMatchInput,
  DimensionScore,
  MatchDimension,
  MatchReason,
  MatchStrength,
} from "./types.ts";
import {
  DIMENSION_WEIGHTS,
  SOURCE_WEIGHTS,
  PREFERRED_CAREER_BOOST,
  CONFIDENCE_CONFIG,
  MATCH_STRENGTH_THRESHOLDS,
  normalizeForMatch,
  wordSimilarity,
} from "./config.ts";

const ALL_DIMENSIONS: MatchDimension[] = [
  "INTEREST",
  "PERSONALITY",
  "APTITUDE",
  "SKILL",
  "SUBJECT",
  "EDUCATION",
  "WORK_ENVIRONMENT",
];

/**
 * Finds the best matching career trait for a student signal.
 * Returns a similarity score 0-1 and the matched trait value.
 */
function findBestTraitMatch(
  studentValue: string,
  traits: { value: string; weight: number }[]
): { score: number; traitValue: string } | null {
  if (!traits.length) return null;

  const normalizedStudent = normalizeForMatch(studentValue);

  // 1. Exact match
  const exact = traits.find(
    (t) => normalizeForMatch(t.value) === normalizedStudent
  );
  if (exact) return { score: 1, traitValue: exact.value };

  // 2. Containment match (student value contains trait value or vice versa)
  const contains = traits.find((t) => {
    const nv = normalizeForMatch(t.value);
    return nv.includes(normalizedStudent) || normalizedStudent.includes(nv);
  });
  if (contains) return { score: 0.85, traitValue: contains.value };

  // 3. Word overlap similarity
  let bestScore = 0;
  let bestTrait = "";
  for (const t of traits) {
    const sim = wordSimilarity(studentValue, t.value);
    if (sim > bestScore) {
      bestScore = sim;
      bestTrait = t.value;
    }
  }
  if (bestScore >= 0.5) return { score: bestScore, traitValue: bestTrait };

  return null;
}

/**
 * Scores a single career against the student's signals for one dimension.
 * Returns a 0-100 dimension score plus matched/unmatched details.
 */
function scoreDimension(
  dimension: MatchDimension,
  studentSignals: CareerMatchInput[],
  careerTraits: { value: string; weight: number }[]
): DimensionScore {
  const dimensionSignals = studentSignals.filter((s) => s.dimension === dimension);
  if (!dimensionSignals.length || !careerTraits.length) {
    return {
      dimension,
      score: 0,
      matchedCount: 0,
      totalTraits: careerTraits.length,
      matchedValues: [],
      unmatchedTraitValues: careerTraits.map((t) => t.value),
    };
  }

  let totalScore = 0;
  let totalWeight = 0;
  const matchedValues: string[] = [];
  const matchedTraitValues = new Set<string>();

  for (const sig of dimensionSignals) {
    const sourceWeight = SOURCE_WEIGHTS[sig.sourceType] ?? 0.5;
    const signalConfidence = sig.confidence;
    const effectiveWeight = sig.score * sourceWeight * signalConfidence;

    const match = findBestTraitMatch(sig.value, careerTraits);
    if (match) {
      // Score = signal strength × match quality × trait weight
      const traitWeight = match.traitValue
        ? careerTraits.find((t) => t.value === match.traitValue)?.weight ?? 1
        : 1;
      const contribution = effectiveWeight * match.score * traitWeight;
      totalScore += contribution;
      totalWeight += 100 * traitWeight; // max possible for this signal
      matchedTraitValues.add(match.traitValue);
      if (match.score >= 0.7) matchedValues.push(sig.value);
    }
  }

  // Also check for career traits that match any student signal
  for (const trait of careerTraits) {
    if (matchedTraitValues.has(trait.value)) continue;
    const bestStudentSignal = dimensionSignals.find((sig) => {
      const match = findBestTraitMatch(trait.value, [
        { value: sig.value, weight: 1 },
      ]);
      return match && match.score >= 0.6;
    });
    if (bestStudentSignal) {
      matchedTraitValues.add(trait.value);
    }
  }

  const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  const unmatched = careerTraits
    .map((t) => t.value)
    .filter((v) => !matchedTraitValues.has(v));

  return {
    dimension,
    score: Math.min(100, score),
    matchedCount: matchedTraitValues.size,
    totalTraits: careerTraits.length,
    matchedValues,
    unmatchedTraitValues: unmatched,
  };
}

/**
 * Pure scoring function: given a career and the student's normalized signals,
 * returns a deterministic match result. No database connection required.
 */
export function scoreCareer(
  career: CareerCandidate,
  studentSignals: CareerMatchInput[],
  preferredCareer: string | null
): CareerMatch {
  // Group career traits by dimension
  const traitsByDim = new Map<MatchDimension, { value: string; weight: number }[]>();
  for (const trait of career.traits) {
    const list = traitsByDim.get(trait.dimension) || [];
    list.push({ value: trait.value, weight: trait.weight });
    traitsByDim.set(trait.dimension, list);
  }

  // Also derive implicit traits from career fields
  const implicitTraits: { dimension: MatchDimension; value: string; weight: number }[] = [];
  for (const s of career.technicalSkills) implicitTraits.push({ dimension: "SKILL", value: s, weight: 0.8 });
  for (const s of career.softSkills) implicitTraits.push({ dimension: "SKILL", value: s, weight: 0.6 });
  for (const i of career.interests) implicitTraits.push({ dimension: "INTEREST", value: i, weight: 0.8 });
  for (const p of career.personalityTraits) implicitTraits.push({ dimension: "PERSONALITY", value: p, weight: 0.8 });
  for (const s of career.recommendedSubjects) implicitTraits.push({ dimension: "SUBJECT", value: s, weight: 0.8 });
  for (const d of career.recommendedDegrees) implicitTraits.push({ dimension: "EDUCATION", value: d, weight: 0.5 });

  // Merge explicit traits and implicit traits
  for (const t of implicitTraits) {
    const list = traitsByDim.get(t.dimension) || [];
    // Avoid duplicates
    if (!list.some((existing) => normalizeForMatch(existing.value) === normalizeForMatch(t.value))) {
      list.push({ value: t.value, weight: t.weight });
    }
    traitsByDim.set(t.dimension, list);
  }

  // ---- score each dimension ----
  const dimensionScores: DimensionScore[] = [];
  let weightedSum = 0;
  let weightSum = 0;

  for (const dim of ALL_DIMENSIONS) {
    const traits = traitsByDim.get(dim) || [];
    const dimScore = scoreDimension(dim, studentSignals, traits);
    dimensionScores.push(dimScore);

    const weight = DIMENSION_WEIGHTS[dim];
    const hasEvidence = dimScore.matchedCount > 0;

    if (hasEvidence) {
      weightedSum += dimScore.score * weight;
      weightSum += weight;
    }
  }

  // ---- available-evidence normalization ----
  // Only count dimensions where the student actually has signals
  const studentDimensions = new Set(studentSignals.map((s) => s.dimension));
  let availableWeight = 0;
  for (const dim of ALL_DIMENSIONS) {
    if (studentDimensions.has(dim)) {
      availableWeight += DIMENSION_WEIGHTS[dim] ?? 0;
    }
  }

  // If no student signals at all, score is 0
  let matchScore = 0;
  if (availableWeight > 0 && weightSum > 0) {
    // Normalize against available evidence, not total possible
    matchScore = Math.round((weightedSum / weightSum) * 100);
  }

  // ---- preferred career boost ----
  let preferenceBoost = false;
  if (preferredCareer) {
    const normalizedPreferred = normalizeForMatch(preferredCareer);
    const normalizedCareerName = normalizeForMatch(career.name);
    const normalizedCareerTitle = normalizeForMatch(career.title);
    const normalizedCategory = normalizeForMatch(career.category || "");

    if (
      normalizedCareerName === normalizedPreferred ||
      normalizedCareerTitle === normalizedPreferred ||
      normalizedCareerName.includes(normalizedPreferred) ||
      normalizedPreferred.includes(normalizedCareerName)
    ) {
      matchScore = Math.min(100, matchScore + PREFERRED_CAREER_BOOST);
      preferenceBoost = true;
    } else if (
      normalizedCategory.includes(normalizedPreferred) ||
      normalizedPreferred.includes(normalizedCategory)
    ) {
      matchScore = Math.min(100, matchScore + Math.round(PREFERRED_CAREER_BOOST / 2));
      preferenceBoost = true;
    }
  }

  matchScore = Math.max(0, Math.min(100, matchScore));

  // ---- confidence score ----
  const totalMatched = dimensionScores.reduce((acc, d) => acc + d.matchedCount, 0);
  const dimensionsMatched = dimensionScores.filter((d) => d.matchedCount > 0).length;
  const sourceTypes = new Set(studentSignals.map((s) => s.sourceType));
  const hasAssessment = studentSignals.some((s) => s.sourceType === "ASSESSMENT");

  let confidenceScore: number = CONFIDENCE_CONFIG.baseConfidence;
  if (totalMatched >= CONFIDENCE_CONFIG.minSignalsForHighConfidence) confidenceScore += 0.2;
  if (dimensionsMatched >= CONFIDENCE_CONFIG.minDimensionsForHighConfidence) confidenceScore += 0.15;
  if (sourceTypes.size > 1) confidenceScore += CONFIDENCE_CONFIG.sourceDiversityBonus;
  if (hasAssessment) confidenceScore += CONFIDENCE_CONFIG.assessmentBonus;
  confidenceScore = Math.min(1, Math.round(confidenceScore * 100) / 100);

  // ---- match strength ----
  let matchStrength: MatchStrength = "missing_evidence";
  if (matchScore >= MATCH_STRENGTH_THRESHOLDS.strong) matchStrength = "strong";
  else if (matchScore >= MATCH_STRENGTH_THRESHOLDS.moderate) matchStrength = "moderate";
  else if (matchScore >= MATCH_STRENGTH_THRESHOLDS.weak) matchStrength = "weak";
  else if (totalMatched > 0) matchStrength = "development_area";

  // ---- strengths and development areas ----
  const strengths: string[] = [];
  const developmentAreas: string[] = [];
  const missingEvidence: string[] = [];
  const reasons: MatchReason[] = [];

  for (const ds of dimensionScores) {
    const dimLabel = ds.dimension.toLowerCase().replace(/_/g, " ");
    const weight = DIMENSION_WEIGHTS[ds.dimension];
    if (weight === 0) continue;

    if (ds.matchedCount > 0 && ds.score >= 60) {
      strengths.push(`Strong ${dimLabel} alignment`);
      reasons.push({
        type: "strength",
        dimension: ds.dimension,
        text: `Strong ${dimLabel} alignment (${ds.matchedCount} matching signals, ${ds.score}%)`,
      });
    } else if (ds.matchedCount > 0 && ds.score >= 30) {
      reasons.push({
        type: "strength",
        dimension: ds.dimension,
        text: `Moderate ${dimLabel} alignment (${ds.matchedCount} signals)`,
      });
    } else if (ds.totalTraits > 0 && ds.matchedCount === 0 && studentDimensions.has(ds.dimension)) {
      developmentAreas.push(`${dimLabel} development needed`);
      reasons.push({
        type: "development_area",
        dimension: ds.dimension,
        text: `${dimLabel} skills need development for this career`,
      });
    } else if (!studentDimensions.has(ds.dimension) && ds.totalTraits > 0) {
      missingEvidence.push(`No ${dimLabel} data available`);
      reasons.push({
        type: "missing_evidence",
        dimension: ds.dimension,
        text: `No ${dimLabel} assessment or profile data available`,
      });
    }
  }

  // ---- preference reason ----
  if (preferenceBoost) {
    reasons.push({
      type: "preference_boost",
      text: "You indicated interest in this career or a related field",
    });
  }

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
    confidenceScore: Math.round(confidenceScore * 100),
    matchStrength,
    dimensionScores,
    strengths,
    developmentAreas,
    missingEvidence,
    reasons,
    sourceSummary,
    preferenceBoost,
  };
}

/**
 * Ranks scored careers deterministically.
 * Primary: matchScore desc
 * Secondary: confidenceScore desc
 * Tertiary: career name asc (deterministic)
 */
export function rankMatches(matches: CareerMatch[]): CareerMatch[] {
  return [...matches].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    return a.career.name.localeCompare(b.career.name);
  });
}
