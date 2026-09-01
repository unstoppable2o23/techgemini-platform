import {
  normalizeForMatch,
  wordSimilarity,
  MATCH_TYPE_STRENGTHS,
  LEXICAL_SIMILARITY_THRESHOLD,
} from "./config";
import { isCanonicalSignal, canonicalizeCareerTraitValue } from "../career-profile/canonical-signals";
import type { MatchType } from "./types";

/**
 * Normalized student signal values are generated with semantic prefixes so the
 * same raw text can appear in several dimensions without colliding (e.g.
 * "subject_studied:Computer Science" is an INTEREST signal, while
 * "Computer Science" feeds SUBJECT). Stripping the known prefixes before text
 * comparison keeps the actual concept comparable while preserving dimensions.
 */
const SIGNAL_PREFIXES = [
  "subject_studied:",
  "subject_enjoyed:",
  "activity:",
  "career_note:",
  "study_level:",
  "highest_education:",
  "grade_level:",
  "average_grade:",
  "exam:",
  "state:",
  "target_country:",
  "budget:",
] as const;

export function stripSignalPrefix(value: string): string {
  const trimmed = value.trim();
  for (const prefix of SIGNAL_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix)) {
      return trimmed.slice(prefix.length).trim();
    }
  }
  return trimmed;
}

/**
 * Resolves a raw value (student signal or career trait) onto a canonical
 * concept key from the assessment vocabulary. Returns null when the value has
 * no defensible canonical meaning. Values that merely contain a canonical term
 * where exactly ONE canonical term is embedded are accepted (career traits
 * like "Logical Mathematical Intelligence" map to logical_mathematical);
 * ambiguous values return null rather than guessing.
 */
export function canonicalKey(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (isCanonicalSignal(trimmed)) return trimmed;

  const underscored = trimmed.replace(/[\s]+/g, "_");
  if (isCanonicalSignal(underscored)) return underscored;

  const alias = canonicalizeCareerTraitValue(trimmed) ?? canonicalizeCareerTraitValue(underscored);
  if (alias) return alias;

  const embedded = embeddedCanonicalKey(trimmed);
  return embedded;
}

/**
 * Finds a canonical key whose human-readable form is exactly embedded in the
 * value. Only returns a key when exactly one candidate matches (never guess
 * between two).
 */
function embeddedCanonicalKey(normalized: string): string | null {
  const candidates: string[] = [];
  for (const key of Object.keys(CANONICAL_KEY_HINT)) {
    const human = key.replace(/_/g, " ");
    if (normalized.includes(human) || normalized.includes(key)) {
      candidates.push(key);
    }
  }
  if (candidates.length === 1) return candidates[0];
  return null;
}

/**
 * Canonical keys we allow to be matched when embedded inside a longer career
 * trait phrase. Kept to well-defined assessment concepts — a trait only maps
 * when the canonical term literally appears in its text.
 */
const CANONICAL_KEY_HINT: Record<string, true> = {
  logical_mathematical: true,
  visual_spatial: true,
  linguistic: true,
  musical: true,
  interpersonal: true,
  intrapersonal: true,
  bodily_kinesthetic: true,
  naturalist: true,
  existential: true,
  computer_science: true,
  mathematics: true,
  physics: true,
  chemistry: true,
  biology: true,
  economics: true,
  psychology: true,
  sociology: true,
  accountancy: true,
  business_studies: true,
  political_science: true,
  history: true,
  geography: true,
  art: true,
  english: true,
  logical_reasoning: true,
  pattern_recognition: true,
  attention_to_detail: true,
  situational_judgment: true,
  emotional_intelligence: true,
  focus_persistence: true,
  self_motivation: true,
};

/**
 * Defensible concept groups for the STRUCTURED tier: near-synonyms that share
 * the same underlying concept but are not canonical signal vocabulary and are
 * not covered by the explicit alias map. Kept deliberately small — the matching
 * engine must never conflate things like "data analysis", "analytical
 * thinking" and "statistics", so only clearly-equivalent terms belong here.
 */
const CONCEPT_GROUPS: Record<string, string[]> = {
  programming: ["programming", "coding", "computer programming"],
  mathematics: ["mathematics", "maths", "math"],
};

const CONCEPT_INDEX: Record<string, string> = (() => {
  const idx: Record<string, string> = {};
  for (const [group, members] of Object.entries(CONCEPT_GROUPS)) {
    for (const member of members) idx[normalizeForMatch(member)] = group;
  }
  return idx;
})();

function conceptGroup(value: string): string | null {
  return CONCEPT_INDEX[normalizeForMatch(value)] ?? null;
}

export type SemanticMatch = {
  matched: boolean;
  strength: number; // 0-1
  matchType: MatchType;
  traitValue: string | null;
  explanation: string | null;
};

const NO_MATCH: SemanticMatch = {
  matched: false,
  strength: 0,
  matchType: "NONE",
  traitValue: null,
  explanation: null,
};

export function matchTierName(strength: number): MatchType {
  if (strength >= MATCH_TYPE_STRENGTHS.CANONICAL) return "CANONICAL";
  if (strength >= MATCH_TYPE_STRENGTHS.ALIAS) return "ALIAS";
  if (strength >= MATCH_TYPE_STRENGTHS.STRUCTURED) return "STRUCTURED";
  return "LEXICAL";
}

/**
 * Matches one student-provided value against a career's traits within a single
 * dimension. Returns the best (highest-strength) match with a structured tier
 * and explanation. Deterministic and free of external calls.
 */
export function matchSignal(
  studentValue: string,
  traits: { value: string; weight: number }[]
): SemanticMatch {
  if (!traits.length) return NO_MATCH;

  const raw = stripSignalPrefix(studentValue);
  const norm = normalizeForMatch(raw);
  if (!norm) return NO_MATCH;

  let best: SemanticMatch = NO_MATCH;

  for (const trait of traits) {
    const m = matchSignalAgainstTrait(raw, norm, trait);
    if (m.matched && m.strength > best.strength) best = m;
  }

  return best;
}

function matchSignalAgainstTrait(
  raw: string,
  norm: string,
  trait: { value: string; weight: number }
): SemanticMatch {
  const traitNorm = normalizeForMatch(trait.value);
  if (!traitNorm) return NO_MATCH;

  const studentKey = canonicalKey(raw);
  const traitKey = canonicalKey(trait.value);

  // CANONICAL tier — both sides resolve to the same canonical concept.
  if (studentKey && traitKey && studentKey === traitKey) {
    return {
      matched: true,
      strength: MATCH_TYPE_STRENGTHS.CANONICAL,
      matchType: "CANONICAL",
      traitValue: trait.value,
      explanation: `Both ${raw} and '${trait.value}' map to the canonical concept '${studentKey}'.`,
    };
  }

  // STRUCTURED tier — both sides belong to the same defended concept group.
  const group = conceptGroup(raw);
  if (group && conceptGroup(trait.value) === group) {
    return {
      matched: true,
      strength: MATCH_TYPE_STRENGTHS.STRUCTURED,
      matchType: "STRUCTURED",
      traitValue: trait.value,
      explanation: `${raw} and '${trait.value}' are equivalent synonyms (${group}).`,
    };
  }

  // LEXICAL tiers — deliberately bounded and never above CANONICAL/ALIAS/STRUCTURED.
  if (norm === traitNorm) {
    return {
      matched: true,
      strength: MATCH_TYPE_STRENGTHS.LEXICAL_EXACT,
      matchType: "LEXICAL",
      traitValue: trait.value,
      explanation: `Text match: '${raw}' equals '${trait.value}' (exact wording, weakest evidence tier).`,
    };
  }

  if (norm.length >= 4 && traitNorm.length >= 4 &&
      (norm.includes(traitNorm) || traitNorm.includes(norm))) {
    return {
      matched: true,
      strength: MATCH_TYPE_STRENGTHS.LEXICAL_CONTAINS,
      matchType: "LEXICAL",
      traitValue: trait.value,
      explanation: `Text match: one value contains the other (partial wording).`,
    };
  }

  const aWords = new Set(norm.split(" ").filter((w) => w.length > 2));
  const bWords = new Set(traitNorm.split(" ").filter((w) => w.length > 2));
  if (aWords.size && bWords.size) {
    let shared = 0;
    for (const w of aWords) if (bWords.has(w)) shared++;
    const subsetCollision =
      shared === Math.min(aWords.size, bWords.size) && aWords.size !== bWords.size;
    if (!subsetCollision && wordSimilarity(norm, traitNorm) >= LEXICAL_SIMILARITY_THRESHOLD) {
      return {
        matched: true,
        strength: MATCH_TYPE_STRENGTHS.LEXICAL_SIMILAR,
        matchType: "LEXICAL",
        traitValue: trait.value,
        explanation: `Text match: significant word overlap between '${raw}' and '${trait.value}'.`,
      };
    }
  }

  return NO_MATCH;
}

/**
 * Describes the canonical match tier of a single value without scanning a
 * career. Useful for explanation text and tests.
 */
export function describeValue(value: string): { canonicalKey: string | null; stripped: string } {
  const stripped = stripSignalPrefix(value);
  return { canonicalKey: canonicalKey(stripped), stripped };
}