import type { ExamReport } from "./tests";

export type AssessmentKind =
  | "stream"
  | "ideal"
  | "personality"
  | "intelligences"
  | "learning";

export type RawAssessmentResults = {
  stream?: ExamReport & { kind: "stream" };
  ideal?: ExamReport & { kind: "ideal" };
  personality?: ExamReport & { kind: "personality" };
  intelligences?: ExamReport & { kind: "intelligences" };
  learning?: ExamReport & { kind: "learning" };
};

export type StudentCareerProfile = {
  available: AssessmentKind[];
  dimensions: Record<string, number>;
  personalityType: string | null;
  recommendedStream: string | null;
  emotionalIntelligence: number | null;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function pct(score: number, max: number): number {
  if (!max) return 50;
  return clamp((score / max) * 100);
}

export function normalizeStreamResult(
  report: Extract<ExamReport, { kind: "stream" }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of report.rows) {
    out[`interest.${row.label.toLowerCase()}`] = pct(row.score, row.max);
  }
  return out;
}

export function normalizePersonalityResult(
  report: Extract<ExamReport, { kind: "personality" }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of report.rows) {
    const total = row.first.count + row.second.count;
    const firstPct = total ? Math.round((row.first.count / total) * 100) : 50;
    out[`personality.${row.first.label.toLowerCase()}`] = firstPct;
    out[`personality.${row.second.label.toLowerCase()}`] = 100 - firstPct;
  }
  return out;
}

export function normalizeIntelligencesResult(
  report: Extract<ExamReport, { kind: "intelligences" }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of report.rows) {
    out[`intelligence.${row.label.toLowerCase()}`] = pct(row.score, row.max);
  }
  out["intelligence.emotional"] = pct(report.emotionalIntelligence, 42);
  return out;
}

export function normalizeLearningResult(
  report: Extract<ExamReport, { kind: "learning" }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const group of report.groups) {
    for (const row of group.rows) {
      out[`learning.${row.abbrev.toLowerCase()}`] = clamp(Math.round(row.score));
    }
  }
  return out;
}

export function normalizeIdealResult(
  report: Extract<ExamReport, { kind: "ideal" }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of report.domains) {
    out[`aptitude.${row.label.toLowerCase()}`] = pct(row.score, row.max);
  }
  for (const s of report.strengths) {
    out[`aptitude.trait.${s.label.toLowerCase()}`] = clamp(s.pct);
  }
  return out;
}

export function buildStudentCareerProfile(
  results: RawAssessmentResults
): StudentCareerProfile {
  const dimensions: Record<string, number> = {};
  const available: AssessmentKind[] = [];

  if (results.stream) {
    available.push("stream");
    Object.assign(dimensions, normalizeStreamResult(results.stream));
  }
  if (results.ideal) {
    available.push("ideal");
    Object.assign(dimensions, normalizeIdealResult(results.ideal));
  }
  if (results.personality) {
    available.push("personality");
    Object.assign(dimensions, normalizePersonalityResult(results.personality));
  }
  if (results.intelligences) {
    available.push("intelligences");
    Object.assign(dimensions, normalizeIntelligencesResult(results.intelligences));
  }
  if (results.learning) {
    available.push("learning");
    Object.assign(dimensions, normalizeLearningResult(results.learning));
  }

  return {
    available,
    dimensions,
    personalityType: results.personality?.type ?? null,
    recommendedStream: results.stream?.recommendedStream ?? null,
    emotionalIntelligence: results.intelligences?.emotionalIntelligence ?? null,
  };
}
