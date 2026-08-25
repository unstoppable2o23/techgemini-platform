import type { TraitDimension } from "@prisma/client";

/**
 * Canonical career-signal vocabulary for Phase 3.
 *
 * Every student signal value produced by the normalization layer uses one of
 * these snake_case values, and every value is intended to be comparable with
 * the CareerTrait vocabulary (see canonicalizeCareerTraitValue).
 *
 * Phase 4 will compare StudentCareerSignal.value against CareerTrait.value.
 * CareerTrait values are free-text (from career enrichment data), so
 * canonicalizeCareerTraitValue maps the known CareerTrait strings onto this
 * vocabulary. Unknown CareerTrait values remain usable via Phase 4 fuzzy
 * matching but have no canonical alias.
 */

export type CanonicalDimension =
  | "INTEREST"
  | "PERSONALITY"
  | "APTITUDE"
  | "SUBJECT"
  | "SKILL"
  | "WORK_ENVIRONMENT"
  | "EDUCATION";

export const CANONICAL_SIGNALS: Record<
  string,
  { dimension: CanonicalDimension; description: string }
> = {
  // ---- Personality poles (from Personality assessment) ----
  extraversion: { dimension: "PERSONALITY", description: "Energised by people and activity" },
  introversion: { dimension: "PERSONALITY", description: "Energised by quiet and focus" },
  sensing: { dimension: "PERSONALITY", description: "Prefers concrete, practical information" },
  intuition: { dimension: "PERSONALITY", description: "Prefers ideas and possibilities" },
  thinking: { dimension: "PERSONALITY", description: "Decides with logic" },
  feeling: { dimension: "PERSONALITY", description: "Decides with values and empathy" },
  judging: { dimension: "PERSONALITY", description: "Prefers plans and structure" },
  perceiving: { dimension: "PERSONALITY", description: "Prefers flexibility and options" },

  // ---- Personality trait aliases (shared with CareerTrait vocabulary) ----
  analytical: { dimension: "PERSONALITY", description: "Logical, objective reasoning" },
  empathetic: { dimension: "PERSONALITY", description: "Warm and understanding of others" },
  organised: { dimension: "PERSONALITY", description: "Plans and orders work" },
  flexible: { dimension: "PERSONALITY", description: "Adapts easily to change" },
  outgoing: { dimension: "PERSONALITY", description: "Sociable and expressive" },
  reserved: { dimension: "PERSONALITY", description: "Thoughtful and private" },
  practical: { dimension: "PERSONALITY", description: "Grounded and realistic" },
  imaginative: { dimension: "PERSONALITY", description: "Idea-driven and original" },

  // ---- Aptitudes (from Multiple Intelligences) ----
  bodily_kinesthetic: { dimension: "APTITUDE", description: "Physical coordination and control" },
  visual_spatial: { dimension: "APTITUDE", description: "Mental imagery and spatial reasoning" },
  linguistic: { dimension: "APTITUDE", description: "Words, reading and writing" },
  logical_mathematical: { dimension: "APTITUDE", description: "Numbers, logic and analysis" },
  musical: { dimension: "APTITUDE", description: "Rhythm, tone and music" },
  interpersonal: { dimension: "APTITUDE", description: "Understanding other people" },
  intrapersonal: { dimension: "APTITUDE", description: "Self-awareness and reflection" },
  naturalist: { dimension: "APTITUDE", description: "Patterns in nature and living things" },
  existential: { dimension: "APTITUDE", description: "Big-picture and purpose questions" },
  emotional_intelligence: { dimension: "APTITUDE", description: "Recognising and managing emotions" },

  // ---- Learning modalities (from Learning & Productivity) ----
  visual_learning: { dimension: "SKILL", description: "Learns best by reading and seeing" },
  auditory_learning: { dimension: "SKILL", description: "Learns best by listening" },
  tactile_learning: { dimension: "SKILL", description: "Learns best by touch and craft" },
  kinesthetic_learning: { dimension: "SKILL", description: "Learns best by doing and moving" },

  // ---- Work environment preferences (from Learning & Productivity) ----
  prefers_quiet: { dimension: "WORK_ENVIRONMENT", description: "Studies and works best in quiet" },
  prefers_background_sound: { dimension: "WORK_ENVIRONMENT", description: "Comfortable with ambient noise" },
  prefers_bright_light: { dimension: "WORK_ENVIRONMENT", description: "Prefers well-lit spaces" },
  prefers_soft_lighting: { dimension: "WORK_ENVIRONMENT", description: "Prefers softer lighting" },
  prefers_warm_environment: { dimension: "WORK_ENVIRONMENT", description: "Works best in warmth" },
  prefers_cool_environment: { dimension: "WORK_ENVIRONMENT", description: "Works best in cool settings" },
  prefers_formal_setting: { dimension: "WORK_ENVIRONMENT", description: "Prefers desk and formal setup" },
  prefers_relaxed_setting: { dimension: "WORK_ENVIRONMENT", description: "Prefers couches and casual spaces" },
  benefits_from_intake: { dimension: "WORK_ENVIRONMENT", description: "Snacking aids concentration" },
  needs_mobility: { dimension: "WORK_ENVIRONMENT", description: "Needs movement to focus" },
  morning_person: { dimension: "WORK_ENVIRONMENT", description: "Sharpest earlier in the day" },
  evening_person: { dimension: "WORK_ENVIRONMENT", description: "Sharpest later in the day" },
  prefers_structure: { dimension: "WORK_ENVIRONMENT", description: "Wants clear guidelines" },
  prefers_autonomy: { dimension: "WORK_ENVIRONMENT", description: "Prefers open, self-directed tasks" },
  collaborative_preference: { dimension: "WORK_ENVIRONMENT", description: "Prefers working with others" },
  independent_preference: { dimension: "WORK_ENVIRONMENT", description: "Prefers working alone" },
  teacher_guided: { dimension: "WORK_ENVIRONMENT", description: "Motivated by teacher approval" },
  self_driven: { dimension: "WORK_ENVIRONMENT", description: "Motivated from within" },

  // ---- Work approach skills (from Learning & Productivity mindset) ----
  focus_persistence: { dimension: "SKILL", description: "Completes work without drifting" },
  self_motivation: { dimension: "SKILL", description: "Driven to learn and perform" },

  // ---- Subjects (from Stream Selector; matches CareerTrait SUBJECT values) ----
  physics: { dimension: "SUBJECT", description: "Physical sciences" },
  chemistry: { dimension: "SUBJECT", description: "Chemical sciences" },
  mathematics: { dimension: "SUBJECT", description: "Mathematics" },
  biology: { dimension: "SUBJECT", description: "Life sciences" },
  accountancy: { dimension: "SUBJECT", description: "Accounting and finance" },
  business_studies: { dimension: "SUBJECT", description: "Business and management" },
  economics: { dimension: "SUBJECT", description: "Economics" },
  history: { dimension: "SUBJECT", description: "History and civics" },
  political_science: { dimension: "SUBJECT", description: "Politics and governance" },
  psychology: { dimension: "SUBJECT", description: "Psychology" },
  sociology: { dimension: "SUBJECT", description: "Society and social systems" },
  art: { dimension: "SUBJECT", description: "Visual and creative arts" },
  english: { dimension: "SUBJECT", description: "Language and literature" },
  geography: { dimension: "SUBJECT", description: "Geography and environment" },
  computer_science: { dimension: "SUBJECT", description: "Computing" },
  physical_education: { dimension: "SUBJECT", description: "Sport and fitness" },

  // ---- Stream orientation (from Stream Selector) ----
  stream_science: { dimension: "INTEREST", description: "Interest in the Science stream" },
  stream_commerce: { dimension: "INTEREST", description: "Interest in the Commerce stream" },
  stream_humanities: { dimension: "INTEREST", description: "Interest in the Humanities/Arts stream" },

  // ---- Aptitude reasoning signals (from Ideal Career assessment sections) ----
  logical_reasoning: { dimension: "APTITUDE", description: "Deductive and logical scenarios" },
  pattern_recognition: { dimension: "APTITUDE", description: "Codes and sequence patterns" },
  attention_to_detail: { dimension: "APTITUDE", description: "Careful information processing" },
  situational_judgment: { dimension: "APTITUDE", description: "Workplace scenario judgement" },
  self_awareness: { dimension: "APTITUDE", description: "Understanding own interests" },
  work_orientation: { dimension: "INTEREST", description: "Attitude towards work settings" },
};

export function isCanonicalSignal(value: string): boolean {
  return Object.prototype.hasOwnProperty.call(CANONICAL_SIGNALS, value);
}

/**
 * Maps known CareerTrait free-text values (Phase 2 enrichment vocabulary)
 * onto canonical student signal values so Phase 4 can compare
 * StudentCareerSignal.value against CareerTrait.value directly.
 * Returns null for CareerTrait values with no canonical alias.
 */
const CAREER_TRAIT_ALIASES: Record<string, string> = {
  analytical: "analytical",
  "analytical thinking": "analytical",
  "analytical rigour": "analytical",
  "logical problem solver": "analytical",
  empathetic: "empathetic",
  compassionate: "empathetic",
  warm: "empathetic",
  organised: "organised",
  organized: "organised",
  "detail-oriented": "attention_to_detail",
  "detail oriented": "attention_to_detail",
  meticulous: "attention_to_detail",
  precise: "attention_to_detail",
  persistent: "focus_persistence",
  resilient: "focus_persistence",
  creative: "imaginative",
  imaginative: "imaginative",
  innovative: "imaginative",
  practical: "practical",
  hands_on: "kinesthetic_learning",
  "hands-on": "kinesthetic_learning",
  outgoing: "outgoing",
  reserved: "reserved",
  curious: "self_motivation",
  self_driven: "self_motivation",
  "self-driven": "self_motivation",
  "self-driven and enthusiastic about what you do": "self_motivation",
  communicative: "communication",
  "strong communication": "communication",
  leadership: "leadership",
  teamwork: "collaboration",
  "team player": "collaboration",
  collaborative: "collaboration",
  vigilant: "attention_to_detail",
};

export function canonicalizeCareerTraitValue(value: string): string | null {
  const key = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(CAREER_TRAIT_ALIASES, key)
    ? CAREER_TRAIT_ALIASES[key]
    : null;
}

export type CareerSignalInput = {
  dimension: TraitDimension;
  value: string;
  score: number;
  confidence: number;
};
