import type { TraitDimension } from "@prisma/client";
import type { ExamReport } from "../tests";
import type { CareerSignalInput } from "./canonical-signals";

export type NormalizedSignal = CareerSignalInput & {
  sourceAssessment: string;
  sourceAssignmentId: string | null;
  sourceVersion: string;
};

export type NormalizationResult = {
  signals: NormalizedSignal[];
  primaryInterests: string[];
  strengths: string[];
};

const conf = (base: number): number => Math.max(0, Math.min(1, base));

function signal(
  dimension: TraitDimension,
  value: string,
  score: number,
  confidence: number,
  source: { assessment: string; assignmentId: string | null; version: string }
): NormalizedSignal {
  return {
    dimension,
    value,
    score: Math.max(0, Math.min(100, Math.round(score))),
    confidence: conf(confidence),
    sourceAssessment: source.assessment,
    sourceAssignmentId: source.assignmentId,
    sourceVersion: source.version,
  };
}

// ---- Stream Selector ----
// Stream results indicate subject orientation (matching CareerTrait SUBJECT
// values) plus a general stream interest. A stream result alone does not
// determine a career.
const STREAM_SUBJECTS: Record<string, string[]> = {
  Science: ["Physics", "Chemistry", "Mathematics", "Biology"],
  Commerce: ["Accountancy", "Business Studies", "Economics"],
  Humanities: ["History", "Political Science", "Psychology", "Sociology"],
  Arts: ["Art", "English", "History"],
};

const STREAM_INTEREST: Record<string, string> = {
  Science: "stream_science",
  Commerce: "stream_commerce",
  Humanities: "stream_humanities",
  Arts: "stream_humanities",
};

export function normalizeStreamReport(
  report: Extract<ExamReport, { kind: "stream" }>,
  source: { assignmentId: string | null; version: string }
): NormalizationResult {
  const signals: NormalizedSignal[] = [];
  const src = { assessment: "stream", assignmentId: source.assignmentId, version: source.version };

  const top = [...report.rows].sort((a, b) => b.score - a.score)[0];
  if (top) {
    const pct = (top.score / top.max) * 100;
    for (const subject of STREAM_SUBJECTS[top.label] || []) {
      signals.push(signal("SUBJECT", subject, pct, 0.7, src));
    }
    const interestValue = STREAM_INTEREST[top.label];
    if (interestValue) {
      signals.push(signal("INTEREST", interestValue, pct, 0.7, src));
    }
  }

  return { signals, primaryInterests: top ? [top.label] : [], strengths: [] };
}

// ---- Ideal Career ----
// Section scores map to aptitude/interest reasoning signals. These are
// honest interpretations of what each section measures — not career verdicts.
const IDEAL_DOMAIN_SIGNALS: Record<string, { dimension: TraitDimension; value: string }> = {
  "166": { dimension: "APTITUDE", value: "self_awareness" },
  "167": { dimension: "INTEREST", value: "work_orientation" },
  "168": { dimension: "APTITUDE", value: "pattern_recognition" },
  "169": { dimension: "APTITUDE", value: "pattern_recognition" },
  "170": { dimension: "APTITUDE", value: "logical_reasoning" },
  "171": { dimension: "APTITUDE", value: "attention_to_detail" },
  "172": { dimension: "INTEREST", value: "situational_judgment" },
};

export function normalizeIdealReport(
  report: Extract<ExamReport, { kind: "ideal" }>,
  source: { assignmentId: string | null; version: string }
): NormalizationResult {
  const signals: NormalizedSignal[] = [];
  const src = { assessment: "ideal", assignmentId: source.assignmentId, version: source.version };

  for (const row of report.domains) {
    const mapping = IDEAL_DOMAIN_SIGNALS[row.key];
    if (!mapping) continue;
    const pct = row.max ? (row.score / row.max) * 100 : 50;
    signals.push(signal(mapping.dimension, mapping.value, pct, 0.6, src));
  }

  const primaryInterests = report.strengths.slice(0, 3).map((s) => s.label);
  return { signals, primaryInterests, strengths: report.strengths.map((s) => s.label) };
}

// ---- Personality ----
// Pole percentages become canonical PERSONALITY signals, and unambiguous
// poles additionally map to trait adjectives shared with CareerTrait.
const POLE_TRAIT_ALIAS: Record<string, string> = {
  Thinking: "analytical",
  Feeling: "empathetic",
  Judging: "organised",
  Perceiving: "flexible",
  Extraversion: "outgoing",
  Introversion: "reserved",
  Sensing: "practical",
  Intuition: "imaginative",
};

export function normalizePersonalityReport(
  report: Extract<ExamReport, { kind: "personality" }>,
  source: { assignmentId: string | null; version: string }
): NormalizationResult {
  const signals: NormalizedSignal[] = [];
  const src = { assessment: "personality", assignmentId: source.assignmentId, version: source.version };

  for (const row of report.rows) {
    const total = row.first.count + row.second.count;
    if (!total) continue;
    const firstPct = Math.round((row.first.count / total) * 100);

    const firstValue = row.first.label.toLowerCase();
    signals.push(signal("PERSONALITY", firstValue, firstPct, 0.8, src));
    signals.push(signal("PERSONALITY", row.second.label.toLowerCase(), 100 - firstPct, 0.8, src));

    const alias = POLE_TRAIT_ALIAS[row.first.label];
    if (alias) {
      signals.push(
        signal(
          "PERSONALITY",
          alias,
          firstPct >= 50 ? firstPct : 100 - firstPct,
          0.6,
          src
        )
      );
    }
  }

  return { signals, primaryInterests: [], strengths: [report.type] };
}

// ---- Multiple Intelligences ----
const INTELLIGENCE_SIGNALS: Record<string, string> = {
  "Bodily-Kinesthetic": "bodily_kinesthetic",
  "Visual-Spatial": "visual_spatial",
  Linguistic: "linguistic",
  "Logical-Mathematical": "logical_mathematical",
  Musical: "musical",
  Interpersonal: "interpersonal",
  Intrapersonal: "intrapersonal",
  Naturalist: "naturalist",
  Existential: "existential",
};

export function normalizeIntelligencesReport(
  report: Extract<ExamReport, { kind: "intelligences" }>,
  source: { assignmentId: string | null; version: string }
): NormalizationResult {
  const signals: NormalizedSignal[] = [];
  const src = { assessment: "intelligences", assignmentId: source.assignmentId, version: source.version };

  for (const row of report.rows) {
    const value = INTELLIGENCE_SIGNALS[row.label];
    if (!value) continue;
    const pct = row.max ? (row.score / row.max) * 100 : 50;
    signals.push(signal("APTITUDE", value, pct, 0.8, src));
  }
  signals.push(
    signal(
      "APTITUDE",
      "emotional_intelligence",
      (report.emotionalIntelligence / 42) * 100,
      0.6,
      src
    )
  );

  const top = [...report.rows].sort((a, b) => b.score - a.score).slice(0, 3);
  return { signals, primaryInterests: [], strengths: top.map((r) => r.label) };
}

// ---- Learning & Productivity ----
// Modality preferences become learning-skill signals; environment and mindset
// preferences become work-environment preference signals. Learning-style
// results are NOT career suitability evidence — confidence is kept low.
const LEARNING_SKILL_SIGNALS: Record<string, string> = {
  VIS: "visual_learning",
  AUD: "auditory_learning",
  TAC: "tactile_learning",
  KIN: "kinesthetic_learning",
};

const LEARNING_ENV_SIGNALS: Record<string, { direct: string; inverse: string }> = {
  SND: { direct: "prefers_quiet", inverse: "prefers_background_sound" },
  LHT: { direct: "prefers_bright_light", inverse: "prefers_soft_lighting" },
  TMP: { direct: "prefers_warm_environment", inverse: "prefers_cool_environment" },
  DES: { direct: "prefers_formal_setting", inverse: "prefers_relaxed_setting" },
  ITK: { direct: "benefits_from_intake", inverse: "prefers_quiet" },
  MOB: { direct: "needs_mobility", inverse: "prefers_formal_setting" },
  TIM: { direct: "morning_person", inverse: "evening_person" },
  ALN: { direct: "collaborative_preference", inverse: "independent_preference" },
  STR: { direct: "prefers_structure", inverse: "prefers_autonomy" },
  TCR: { direct: "teacher_guided", inverse: "self_driven" },
};

const LEARNING_MINDSET_SKILLS: Record<string, string> = {
  PER: "focus_persistence",
  MOT: "self_motivation",
};

export function normalizeLearningReport(
  report: Extract<ExamReport, { kind: "learning" }>,
  source: { assignmentId: string | null; version: string }
): NormalizationResult {
  const signals: NormalizedSignal[] = [];
  const src = { assessment: "learning", assignmentId: source.assignmentId, version: source.version };

  for (const group of report.groups) {
    for (const row of group.rows) {
      const abbrev = row.abbrev;
      if (LEARNING_SKILL_SIGNALS[abbrev]) {
        signals.push(
          signal("SKILL", LEARNING_SKILL_SIGNALS[abbrev], row.score, 0.5, src)
        );
        continue;
      }
      if (LEARNING_MINDSET_SKILLS[abbrev]) {
        signals.push(
          signal("SKILL", LEARNING_MINDSET_SKILLS[abbrev], row.score, 0.5, src)
        );
        continue;
      }
      const env = LEARNING_ENV_SIGNALS[abbrev];
      if (env) {
        const direct = row.score >= 50;
        signals.push(
          signal(
            "WORK_ENVIRONMENT",
            direct ? env.direct : env.inverse,
            direct ? row.score : 100 - row.score,
            0.5,
            src
          )
        );
      }
    }
  }

  return { signals, primaryInterests: [], strengths: [] };
}

// ---- dispatcher ----
export function normalizeAssessmentReport(
  kind: string,
  report: ExamReport,
  source: { assignmentId: string | null; version: string }
): NormalizationResult {
  switch (kind) {
    case "stream":
      return normalizeStreamReport(report as Extract<ExamReport, { kind: "stream" }>, source);
    case "ideal":
      return normalizeIdealReport(report as Extract<ExamReport, { kind: "ideal" }>, source);
    case "personality":
      return normalizePersonalityReport(report as Extract<ExamReport, { kind: "personality" }>, source);
    case "intelligences":
      return normalizeIntelligencesReport(report as Extract<ExamReport, { kind: "intelligences" }>, source);
    case "learning":
      return normalizeLearningReport(report as Extract<ExamReport, { kind: "learning" }>, source);
    default:
      return { signals: [], primaryInterests: [], strengths: [] };
  }
}
