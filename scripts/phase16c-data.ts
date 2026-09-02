/**
 * Phase 16C — career intelligence enrichment data (v1).
 *
 * Provides canonical APTITUDE and WORK_ENVIRONMENT career traits plus
 * INTEREST/PERSONALITY enrichment for thin careers. Every APTITUDE and
 * WORK_ENVIRONMENT value is drawn from the EXISTING canonical assessment signal
 * vocabulary (Multiple Intelligences, Ideal Career, Learning & Productivity) so
 * the deterministic engine can match student assessment outputs directly.
 *
 * Honesty note: this phase deliberately uses the canonical assessment
 * vocabulary, NOT invented environment nouns (e.g. "office_based",
 * "people_facing"). Students never emit such values, so they could never match,
 * and the STOP CONDITIONS forbid extending the assessment vocabulary. Only the
 * canonical Learning & Productivity signals are used for occupational
 * environment compatibility, because those are the signals a student can
 * actually produce.
 *
 * All values below are constraints of a pure data layer. They never claim that
 * an aptitude or environment match predicts career success — only that it is
 * compatibility evidence for the matching engine.
 */

export type TraitEntry = { value: string; weight: number };

// Canonical APTITUDE signals (Multiple Intelligences + Ideal Career).
const APTITUDE_CANONICAL = {
  logical_reasoning: "logical_reasoning",
  logical_mathematical: "logical_mathematical",
  pattern_recognition: "pattern_recognition",
  attention_to_detail: "attention_to_detail",
  visual_spatial: "visual_spatial",
  linguistic: "linguistic",
  interpersonal: "interpersonal",
  intrapersonal: "intrapersonal",
  naturalist: "naturalist",
  emotional_intelligence: "emotional_intelligence",
  bodily_kinesthetic: "bodily_kinesthetic",
} as const;

// Canonical WORK_ENVIRONMENT signals (Learning & Productivity).
const WORKENV_CANONICAL = {
  collaborative: "collaborative_preference",
  independent: "independent_preference",
  structured: "prefers_structure",
  autonomy: "prefers_autonomy",
  quiet: "prefers_quiet",
  formal: "prefers_formal_setting",
  self_driven: "self_driven",
} as const;

const apt = (v: string, w: number): TraitEntry => ({ value: v, weight: w });
const we = (v: string, w: number): TraitEntry => ({ value: v, weight: w });

const A = APTITUDE_CANONICAL;
const W = WORKENV_CANONICAL;

/**
 * Occupational APTITUDE sets — compatibility evidence only. weight: 1 =
 * career-defining, 0.6 = supporting.
 */
export const APTITUDE_BY_CAREER: Record<string, TraitEntry[]> = {
  // ---- Technology & Software / Data & AI ----
  "software-engineering": [
    apt(A.logical_reasoning, 1),
    apt(A.logical_mathematical, 0.6),
    apt(A.pattern_recognition, 0.6),
    apt(A.attention_to_detail, 0.6),
  ],
  "data-science": [
    apt(A.pattern_recognition, 1),
    apt(A.logical_mathematical, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.intrapersonal, 0.6),
  ],
  "data-engineering": [
    apt(A.logical_reasoning, 1),
    apt(A.attention_to_detail, 0.6),
    apt(A.logical_mathematical, 0.6),
  ],
  "cyber-security": [
    apt(A.attention_to_detail, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.pattern_recognition, 0.6),
  ],
  "artificial-intelligence": [
    apt(A.pattern_recognition, 1),
    apt(A.logical_mathematical, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],
  "machine-learning-engineering": [
    apt(A.pattern_recognition, 1),
    apt(A.logical_mathematical, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],
  "cloud-computing": [apt(A.logical_reasoning, 0.6), apt(A.attention_to_detail, 0.6)],

  // ---- Engineering ----
  "civil-engineering": [
    apt(A.visual_spatial, 1),
    apt(A.attention_to_detail, 0.6),
    apt(A.logical_mathematical, 0.6),
  ],
  "mechanical-engineering": [
    apt(A.visual_spatial, 0.6),
    apt(A.bodily_kinesthetic, 0.6),
    apt(A.logical_mathematical, 0.6),
  ],
  "electrical-engineering": [
    apt(A.logical_mathematical, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.attention_to_detail, 0.6),
  ],
  "aerospace-engineering": [
    apt(A.logical_mathematical, 1),
    apt(A.visual_spatial, 0.6),
    apt(A.attention_to_detail, 0.6),
  ],
  "chemical-engineering": [
    apt(A.logical_mathematical, 1),
    apt(A.attention_to_detail, 0.6),
    apt(A.naturalist, 0.6),
  ],
  "robotics-engineering": [
    apt(A.logical_mathematical, 1),
    apt(A.bodily_kinesthetic, 0.6),
    apt(A.visual_spatial, 0.6),
  ],
  "mechatronics-engineering": [
    apt(A.logical_mathematical, 0.6),
    apt(A.bodily_kinesthetic, 0.6),
    apt(A.visual_spatial, 0.6),
  ],
  "agricultural-engineering": [
    apt(A.naturalist, 1),
    apt(A.logical_mathematical, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],

  // ---- Medicine / Health / Life Sciences ----
  medicine: [
    apt(A.attention_to_detail, 1),
    apt(A.interpersonal, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.emotional_intelligence, 0.6),
  ],
  "veterinary-science": [
    apt(A.attention_to_detail, 1),
    apt(A.interpersonal, 0.6),
    apt(A.naturalist, 0.6),
  ],
  "medical-laboratory-sciences": [apt(A.attention_to_detail, 1), apt(A.logical_reasoning, 0.6)],
  pharmacology: [
    apt(A.attention_to_detail, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.naturalist, 0.6),
  ],
  "biotechnology-research": [
    apt(A.naturalist, 1),
    apt(A.attention_to_detail, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],
  "public-health": [
    apt(A.interpersonal, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.emotional_intelligence, 0.6),
  ],
  "wildlife-biology": [apt(A.naturalist, 1), apt(A.attention_to_detail, 0.6)],
  "forensic-science": [
    apt(A.attention_to_detail, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.pattern_recognition, 0.6),
  ],
  "forensic-accounting": [
    apt(A.attention_to_detail, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.pattern_recognition, 0.6),
  ],
  "gemology-and-gem-testing": [
    apt(A.attention_to_detail, 1),
    apt(A.visual_spatial, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],

  // ---- Business / Finance / Accounting ----
  "chartered-accountancy": [
    apt(A.attention_to_detail, 1),
    apt(A.logical_mathematical, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],
  "actuarial-science": [
    apt(A.logical_mathematical, 1),
    apt(A.pattern_recognition, 0.6),
    apt(A.attention_to_detail, 0.6),
  ],
  economics: [apt(A.logical_mathematical, 0.6), apt(A.logical_reasoning, 0.6)],
  "retail-banking": [apt(A.logical_mathematical, 0.6), apt(A.interpersonal, 0.6)],
  "investment-banking": [apt(A.logical_mathematical, 1), apt(A.attention_to_detail, 0.6)],

  // ---- Law ----
  law: [apt(A.logical_reasoning, 1), apt(A.linguistic, 0.6), apt(A.interpersonal, 0.6)],
  "cyber-law": [
    apt(A.logical_reasoning, 1),
    apt(A.attention_to_detail, 0.6),
    apt(A.linguistic, 0.6),
  ],
  "intellectual-property-rights": [
    apt(A.logical_reasoning, 0.6),
    apt(A.attention_to_detail, 0.6),
  ],

  // ---- Psychology / Social ----
  psychology: [apt(A.interpersonal, 1), apt(A.emotional_intelligence, 1), apt(A.linguistic, 0.6)],
  "clinical-psychology": [
    apt(A.interpersonal, 1),
    apt(A.emotional_intelligence, 1),
    apt(A.logical_reasoning, 0.6),
  ],
  "social-work-and-development-sector": [
    apt(A.interpersonal, 1),
    apt(A.emotional_intelligence, 0.6),
  ],
  "human-resource-management": [apt(A.interpersonal, 1), apt(A.emotional_intelligence, 0.6)],

  // ---- Design / Media / Arts ----
  "fine-arts": [apt(A.visual_spatial, 1), apt(A.bodily_kinesthetic, 0.6)],
  "graphic-design": [apt(A.visual_spatial, 1), apt(A.attention_to_detail, 0.6)],
  "user-experience-design-ux": [
    apt(A.visual_spatial, 1),
    apt(A.interpersonal, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],
  "product-design": [
    apt(A.visual_spatial, 1),
    apt(A.bodily_kinesthetic, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],
  "industrial-design": [
    apt(A.visual_spatial, 1),
    apt(A.bodily_kinesthetic, 0.6),
    apt(A.logical_reasoning, 0.6),
  ],
  "fashion-design": [apt(A.visual_spatial, 1), apt(A.bodily_kinesthetic, 0.6)],
  "interior-design": [apt(A.visual_spatial, 1), apt(A.attention_to_detail, 0.6)],
  "photography": [apt(A.visual_spatial, 1), apt(A.bodily_kinesthetic, 0.6)],
  "content-creation": [apt(A.linguistic, 1)],
  "digital-marketing": [apt(A.linguistic, 0.6), apt(A.interpersonal, 0.6)],

  // ---- Architecture ----
  architecture: [
    apt(A.visual_spatial, 1),
    apt(A.attention_to_detail, 1),
    apt(A.logical_mathematical, 0.6),
  ],

  // ---- Environment / Agriculture ----
  "environmental-science": [
    apt(A.naturalist, 1),
    apt(A.logical_reasoning, 0.6),
    apt(A.interpersonal, 0.6),
  ],
  "climate-science": [apt(A.naturalist, 1), apt(A.logical_mathematical, 0.6)],

  // ---- Education ----
  "special-education": [
    apt(A.interpersonal, 1),
    apt(A.emotional_intelligence, 0.6),
    apt(A.linguistic, 0.6),
  ],
};

/**
 * Occupational WORK_ENVIRONMENT sets — compatibility evidence only.
 */
export const WORKENV_BY_CAREER: Record<string, TraitEntry[]> = {
  // ---- Technology & Software / Data & AI ----
  "software-engineering": [we(W.independent, 1), we(W.quiet, 0.6)],
  "data-science": [we(W.independent, 1), we(W.quiet, 0.6)],
  "data-engineering": [we(W.independent, 1), we(W.quiet, 0.6)],
  "cyber-security": [we(W.independent, 1), we(W.quiet, 0.6)],
  "artificial-intelligence": [we(W.independent, 1), we(W.quiet, 0.6)],
  "machine-learning-engineering": [we(W.independent, 1), we(W.quiet, 0.6)],
  "cloud-computing": [we(W.independent, 1), we(W.quiet, 0.6)],

  // ---- Engineering ----
  "civil-engineering": [we(W.structured, 0.6), we(W.collaborative, 0.6)],
  "mechanical-engineering": [we(W.collaborative, 0.6)],
  "electrical-engineering": [we(W.collaborative, 0.6)],
  "aerospace-engineering": [we(W.structured, 0.6), we(W.collaborative, 0.6)],
  "chemical-engineering": [we(W.structured, 0.6), we(W.collaborative, 0.6)],
  "robotics-engineering": [we(W.collaborative, 0.6)],
  "mechatronics-engineering": [we(W.collaborative, 0.6)],
  "agricultural-engineering": [we(W.independent, 0.6), we(W.autonomy, 0.6)],

  // ---- Medicine / Health / Life Sciences ----
  medicine: [we(W.structured, 1), we(W.collaborative, 0.6)],
  "veterinary-science": [we(W.collaborative, 0.6)],
  "medical-laboratory-sciences": [we(W.structured, 1), we(W.quiet, 0.6)],
  pharmacology: [we(W.structured, 0.6), we(W.quiet, 0.6)],
  "biotechnology-research": [we(W.independent, 1), we(W.autonomy, 0.6), we(W.quiet, 0.6)],
  "public-health": [we(W.collaborative, 0.6), we(W.structured, 0.6)],
  "wildlife-biology": [we(W.independent, 1), we(W.autonomy, 1)],
  "forensic-science": [we(W.structured, 0.6), we(W.quiet, 0.6)],
  "forensic-accounting": [we(W.structured, 1), we(W.quiet, 0.6)],
  "gemology-and-gem-testing": [we(W.independent, 0.6), we(W.quiet, 0.6)],

  // ---- Business / Finance ----
  "chartered-accountancy": [we(W.structured, 1), we(W.quiet, 0.6)],
  "actuarial-science": [we(W.independent, 1), we(W.quiet, 0.6), we(W.structured, 0.6)],
  economics: [we(W.independent, 0.6), we(W.quiet, 0.6)],
  "retail-banking": [we(W.structured, 0.6), we(W.collaborative, 0.6)],
  "investment-banking": [we(W.structured, 1)],

  // ---- Law ----
  law: [we(W.structured, 1), we(W.formal, 0.6)],
  "cyber-law": [we(W.independent, 0.6), we(W.quiet, 0.6)],
  "intellectual-property-rights": [we(W.independent, 0.6), we(W.quiet, 0.6)],

  // ---- Psychology / Social ----
  psychology: [we(W.collaborative, 0.6)],
  "clinical-psychology": [we(W.collaborative, 0.6), we(W.quiet, 0.6)],
  "social-work-and-development-sector": [we(W.collaborative, 0.6)],
  "human-resource-management": [we(W.collaborative, 1)],

  // ---- Design / Media / Arts ----
  "fine-arts": [we(W.quiet, 0.6), we(W.autonomy, 0.6)],
  "graphic-design": [we(W.quiet, 0.6), we(W.autonomy, 0.6)],
  "user-experience-design-ux": [we(W.collaborative, 0.6), we(W.autonomy, 0.6)],
  "product-design": [we(W.collaborative, 0.6), we(W.autonomy, 0.6)],
  "industrial-design": [we(W.autonomy, 0.6)],
  "fashion-design": [we(W.collaborative, 0.6), we(W.quiet, 0.6)],
  "interior-design": [we(W.collaborative, 0.6), we(W.autonomy, 0.6)],
  "photography": [we(W.autonomy, 0.6), we(W.quiet, 0.6)],
  "content-creation": [we(W.autonomy, 0.6)],
  "digital-marketing": [we(W.collaborative, 0.6)],

  // ---- Architecture ----
  architecture: [we(W.structured, 0.6), we(W.collaborative, 0.6)],

  // ---- Environment / Agriculture ----
  "environmental-science": [we(W.independent, 0.6), we(W.autonomy, 0.6)],
  "climate-science": [we(W.independent, 0.6), we(W.quiet, 0.6)],

  // ---- Education ----
  "special-education": [we(W.collaborative, 1), we(W.structured, 0.6)],
};

/**
 * INTEREST / PERSONALITY enrichment for the thin careers identified in
 * Phase 16B. Only meaningful, career-defining free-text values are added.
 */
export const THIN_CAREER_ENRICHMENT: Record<
  string,
  { interests: string[]; personality: string[] }
> = {
  "forensic-accounting": {
    interests: ["Fraud detection", "Financial investigation", "Legal and regulatory detail"],
    personality: ["Meticulous", "Analytical", "Cautious"],
  },
  "cyber-law": {
    interests: ["Technology law", "Data privacy", "Legal argument and policy"],
    personality: ["Analytical", "Precise", "Persuasive"],
  },
  "gemology-and-gem-testing": {
    interests: ["Gemstones and minerals", "Scientific identification", "Detailed inspection"],
    personality: ["Observant", "Methodical", "Patient"],
  },
  "veterinary-science": {
    interests: ["Animal health and care", "Biological sciences", "Practical clinical work"],
    personality: ["Compassionate", "Diligent", "Calm under pressure"],
  },
  "visual-merchandising": {
    interests: ["Retail display design", "Visual styling", "Consumer trends"],
    personality: ["Creative", "Observant", "Detail-oriented"],
  },
  advertising: {
    interests: ["Persuasive communication", "Brand storytelling", "Consumer psychology"],
    personality: ["Creative", "Outgoing", "Persuasive"],
  },
  "wildlife-biology": {
    interests: ["Wildlife conservation", "Field research", "Ecological systems"],
    personality: ["Patient", "Observant", "Persistent"],
  },
  "library-sciences": {
    interests: ["Information organisation", "Research and cataloguing", "Public services"],
    personality: ["Organised", "Patient", "Detail-oriented"],
  },
  "forensic-science": {
    interests: ["Crime scene analysis", "Evidence examination", "Scientific investigation"],
    personality: ["Meticulous", "Analytical", "Composed"],
  },
  "game-development": {
    interests: ["Gameplay programming", "Game design", "Interactive systems"],
    personality: ["Creative", "Persistent", "Playful"],
  },
  "information-technology-business-analysis": {
    interests: ["Requirements analysis", "Business process improvement", "Systems design"],
    personality: ["Analytical", "Communicative", "Organised"],
  },
  "agricultural-engineering": {
    interests: ["Farm machinery and systems", "Crop and soil technology", "Sustainable farming"],
    personality: ["Practical", "Methodical", "Problem-solver"],
  },
};