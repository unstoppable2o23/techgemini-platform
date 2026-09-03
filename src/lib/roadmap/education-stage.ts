/**
 * Phase 21 — Education-stage detection.
 *
 * Maps a student's profile fields (grade level, study level, highest
 * education) to a roadmap education stage. This determines which roadmap
 * template applies. When information is unavailable it returns UNKNOWN so the
 * generator emits a conservative, low-information roadmap rather than guessing.
 */
import type { RoadmapEducationStage } from "./types.ts";

export interface StageInput {
  gradeLevel?: string | null;
  studyLevel?: string | null;
  highestEducation?: string | null;
}

const GRADE_10_RE = /(^|[^\d])(10|10th|x|class\s*10|standard\s*10|sse?)([^\d]|$)/i;
const GRADE_12_RE = /(^|[^\d])(12|12th|xi?i?i?|class\s*12|standard\s*12|hsce?)([^\d]|$)/i;
const POSTGRAD_RE =
  /\b(m\.?tech|m\.?sc|m\.?a|m\.?com|mba|pgdm|m\.?(ba|pharm|ed|ca|fa|ds|it|des)|master|postgraduate|post-graduate|ph\.?d|doctoral|doctorate)\b/i;
const UNDERGRAD_RE =
  /\b(b\.?tech|b\.?sc|b\.?a|b\.?com|b\.?(ba|ms|ca|pharm|ed|fa|ds|it|des|eng)|bachelor|undergraduate|b\.e\.?|bs|ba|bsc|btech|degree)\b/i;

/**
 * Stage precedence when several fields point different ways:
 *   highestEducation (completed qualification) is the most reliable anchor,
 *   then studyLevel, then gradeLevel. Postgraduate wins over undergraduate.
 */
export function detectEducationStage(input: StageInput): RoadmapEducationStage {
  const hay = [input.gradeLevel, input.studyLevel, input.highestEducation]
    .filter(Boolean)
    .map((s) => ` ${String(s).toLowerCase()} `)
    .join(" ");

  if (!hay.trim()) return "UNKNOWN";

  // Highest completed qualification is the strongest signal.
  if (POSTGRAD_RE.test(hay)) return "POSTGRADUATE";
  if (UNDERGRAD_RE.test(hay)) return "UNDERGRADUATE";

  // Grade-level markers (X / XII) indicate school stage.
  if (GRADE_12_RE.test(hay)) return "SCHOOL_CLASS12";
  if (GRADE_10_RE.test(hay)) return "SCHOOL_CLASS10";

  // A studyLevel of "undergraduate" without a degree marker.
  if (/(undergraduate)/i.test(hay)) return "UNDERGRADUATE";

  // Free-text highest education referring to working/transition.
  if (/working|professional|career|switch|job|employed|practitioner/i.test(hay)) {
    return "CAREER_SWITCHER";
  }

  return "UNKNOWN";
}