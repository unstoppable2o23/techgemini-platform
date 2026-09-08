// Phase 24 — Student Registration V2: shared normalization helpers.
//
// All normalizers are pure and conservative: they collapse known aliases to the
// canonical vocabulary and leave anything else untouched. They are used by both
// the student-facing UI/save path and the server-side authoritative validation,
// so UI and server agree on the canonical representation.

import {
  canonicalStageAlias,
  canonicalSubjectAlias,
  classifyStudyLevel,
  gradeValueToPercent,
  type CanonicalStage,
  type GradeFormat,
  type PersonaKind,
} from "./vocabulary.ts";

export type NormalizedStage =
  | { ok: true; value: CanonicalStage | string; canonical: boolean }
  | { ok: false; value: null; canonical: false };

/**
 * Normalizes an education-stage token ("10th", "Class 10", "SSC", "Polytechnic",
 * "Working Professional", …) to canonical stage text. When the input is already
 * canonical, or matches an alias, ok=true. Otherwise the caller keeps the raw
 * value (surface via the explicit "Other" path — never invented or rewritten).
 */
export function normalizeStage(
  raw?: string | null
): { value: CanonicalStage | string; canonical: boolean } {
  if (!raw) return { value: "", canonical: false };
  const trimmed = raw.trim();
  const alias = canonicalStageAlias(trimmed);
  if (alias) return { value: alias, canonical: true };
  const lower = trimmed.toLowerCase();
  return { value: trimmed, canonical: lower === "other" };
}

export function isCanonicalStage(raw: string): boolean {
  return Boolean(canonicalStageAlias(raw) ?? /^other$/i.test(raw.trim()));
}

/**
 * Collapses subject-name aliases to the canonical taxonomy labels. Names that
 * are not recognized are returned untouched (they must go through the explicit
 * "Other" subject input — Part 6).
 */
export function normalizeSubjectName(raw?: string | null): string {
  if (!raw) return "";
  const alias = canonicalSubjectAlias(raw);
  return alias ?? raw.trim();
}

export function normalizeSubjectList(names: string[]): string[] {
  return Array.from(new Set((names || []).map((n) => normalizeSubjectName(n)).filter(Boolean)));
}

/**
 * Converts a structured grade ("85", "8.5 CGPA", "3.2 GPA") into the canonical
 * 0–100 percentage string that averageGrade has always stored. Returns "" when
 * no value is provided; a caller-facing marker that the engine never sees.
 */
export function normalizeAverageGrade(
  value: string,
  format: GradeFormat = "percentage"
): string {
  if (!value) return "";
  const pct = gradeValueToPercent(value, format);
  if (pct === null) return "";
  return String(Math.round(pct * 100) / 100);
}

export { classifyStudyLevel };
export type { PersonaKind, GradeFormat };