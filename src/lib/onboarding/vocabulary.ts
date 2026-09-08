// Phase 24 — Student Registration V2: canonical education/stage vocabulary.
//
// These are the canonical strings accepted from the V2 registration and
// onboarding surfaces. They intentionally reuse the existing DB value space
// (studyLevel / gradeLevel / highestEducation hold stage values only, matching
// the same consumer regexes as before). Legacy stored values are never
// rewritten; they keep working through the same matchers.

export const CANONICAL_STAGES = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Diploma (Polytechnic)",
  "Year 1 Undergraduate",
  "Year 2 Undergraduate",
  "Year 3 Undergraduate",
  "Year 4 Undergraduate",
  "Postgraduate",
  "Doctoral",
  "Working Professional",
  "Other",
] as const;

export type CanonicalStage = (typeof CANONICAL_STAGES)[number];

export const CANONICAL_HIGHEST_EDUCATION = [
  "Still in school",
  "Primary School",
  "Middle School",
  "Secondary School (Grade 10)",
  "Grade 12 / High School",
  "Post-Secondary Certificate",
  "Undergraduate Diploma",
  "Undergraduate Advanced Diploma",
  "Bachelor's Degree",
  "Postgraduate Diploma / Certificate",
  "Master's Degree",
  "Doctoral Degree",
  "Other",
] as const;

// Diary-style aliases → canonical stage. Empty/unknown input stays as-is
// (callers treat it as a custom "Other" value, exactly as the platform always did).
const STAGE_ALIASES: Record<string, CanonicalStage> = {
  "8th": "Class 8",
  "8": "Class 8",
  "class 8": "Class 8",
  "grade 8": "Class 8",
  "standard 8": "Class 8",
  "viii": "Class 8",
  "9th": "Class 9",
  "9": "Class 9",
  "class 9": "Class 9",
  "grade 9": "Class 9",
  "ix": "Class 9",
  "10th": "Class 10",
  "10": "Class 10",
  "class 10": "Class 10",
  "grade 10": "Class 10",
  "x": "Class 10",
  "ssc": "Class 10",
  "tenth": "Class 10",
  "standard 10": "Class 10",
  "11th": "Class 11",
  "11": "Class 11",
  "class 11": "Class 11",
  "grade 11": "Class 11",
  "xi": "Class 11",
  "12th": "Class 12",
  "12": "Class 12",
  "class 12": "Class 12",
  "grade 12": "Class 12",
  "xii": "Class 12",
  "hsc": "Class 12",
  "intermediate": "Class 12",
  "+2": "Class 12",
  "diploma": "Diploma (Polytechnic)",
  "diploma (polytechnic)": "Diploma (Polytechnic)",
  "polytechnic": "Diploma (Polytechnic)",
  "diploma engineering": "Diploma (Polytechnic)",
  "engineering diploma": "Diploma (Polytechnic)",
  "diploma in engineering": "Diploma (Polytechnic)",
  "working professional": "Working Professional",
  "working": "Working Professional",
  "professional": "Working Professional",
  "employed": "Working Professional",
  "job": "Working Professional",
  "postgraduate": "Postgraduate",
  "post graduate": "Postgraduate",
  "post-graduate": "Postgraduate",
  "mba": "Postgraduate",
  "m.tech": "Postgraduate",
  "mtech": "Postgraduate",
  "masters": "Postgraduate",
  "doctoral": "Doctoral",
  "ph.d": "Doctoral",
  "phd": "Doctoral",
};

export type PersonaKind =
  | "school"
  | "diploma"
  | "undergraduate"
  | "postgraduate"
  | "doctoral"
  | "working"
  | "other";

// Context-aware persona for the adaptive education sections (Part 7/16).
export function classifyStudyLevel(studyLevel?: string | null): PersonaKind {
  const s = (studyLevel || "").toLowerCase().trim();
  if (/diploma|polytechnic/.test(s)) return "diploma";
  if (/working|professional|employed|job/.test(s)) return "working";
  if (/class\s*\d{1,2}|grade\s*\d{1,2}|8th|9th|10th|11th|12th|secondary|school|ssc|hsc|nursery/.test(s)) return "school";
  if (/year \d undergraduate|undergraduate|bachelor|degree/i.test(s) || /\bb\.?(tech|sc|a|com|ba|ms|ca|pharm|ed|fa|ds|it|des|eng|e\.?)\b/i.test(s) || /\bmbbs\b/i.test(s)) return "undergraduate";
  if (/postgraduate|post graduate|post-graduate|master/i.test(s) || /\bm\.?(tech|sc|a|com|ba|ca|pharm)\b/i.test(s)) return "postgraduate";
  if (/doctoral|ph\.?d/i.test(s)) return "doctoral";
  return "other";
}

// Structured education fields. The selected branch/program/role is persisted
// in the additive `currentProgram` field, which matching never consumes — the
// stage value (studyLevel) stays canonical and the branch text is prevented
// from leaking into career-note or stage signals (Part 7/8/13).
export const DIPLOMA_BRANCH_OPTIONS = [
  "Computer Science & IT",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Electronics & Communication",
  "Automobile Engineering",
  "Chemical Engineering",
  "Fashion & Textile Technology",
  "Other",
] as const;

export const UG_PROGRAM_OPTIONS = [
  "B.Tech / B.E.",
  "B.Sc.",
  "B.Com.",
  "B.A.",
  "BBA",
  "BCA",
  "B.Pharm",
  "MBBS",
  "LL.B.",
  "B.Des.",
  "Other",
] as const;

export const PG_PROGRAM_OPTIONS = [
  "M.Tech / M.E.",
  "M.Sc.",
  "M.Com.",
  "M.A.",
  "MBA",
  "MCA",
  "LL.M.",
  "M.Pharm",
  "MD / MS",
  "Other",
] as const;

export const PROGRAM_YEAR_OPTIONS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"] as const;

// Canonical subject vocabulary (matches the Subject taxonomy seeds) plus the
// alias set that collapses "Maths/Mathematics/math" and friends to one label
// (Part 6). Unknown names are not fabricated — they go through the explicit
// "Other" path exactly as before.
export const CANONICAL_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Statistics",
  "Economics",
  "Accountancy",
  "Business Studies",
  "English",
  "History",
  "Geography",
  "Psychology",
  "Political Science",
  "Sociology",
  "Art & Design",
  "Languages",
] as const;

const SUBJECT_ALIASES: Record<string, string> = {
  maths: "Mathematics",
  math: "Mathematics",
  mathematics: "Mathematics",
  physics: "Physics",
  phy: "Physics",
  chemistry: "Chemistry",
  chem: "Chemistry",
  biology: "Biology",
  bio: "Biology",
  "computer science": "Computer Science",
  cs: "Computer Science",
  computers: "Computer Science",
  computer: "Computer Science",
  "computer science & it": "Computer Science",
  "computer science & information technology": "Computer Science",
  "computer science and it": "Computer Science",
  statistics: "Statistics",
  stats: "Statistics",
  economics: "Economics",
  eco: "Economics",
  accountancy: "Accountancy",
  accounting: "Accountancy",
  accounts: "Accountancy",
  "business studies": "Business Studies",
  business: "Business Studies",
  english: "English",
  history: "History",
  geography: "Geography",
  psychology: "Psychology",
  psy: "Psychology",
  "political science": "Political Science",
  "pol science": "Political Science",
  "pol sci": "Political Science",
  politics: "Political Science",
  sociology: "Sociology",
  "art & design": "Art & Design",
  "art and design": "Art & Design",
  "fine arts": "Art & Design",
  art: "Art & Design",
  languages: "Languages",
  language: "Languages",
  "foreign language": "Languages",
};

export type GradeFormat = "percentage" | "cgpa" | "gpa";

export function gradeValueToPercent(value: string, format: GradeFormat): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  if (isNaN(n)) return null;
  if (format === "cgpa") return clamp(n * 10, 0, 100);
  if (format === "gpa") return clamp(n * 25, 0, 100);
  return clamp(n, 0, 100);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function canonicalStageAlias(raw?: string | null): CanonicalStage | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return STAGE_ALIASES[key] ?? null;
}

export function canonicalSubjectAlias(raw?: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const hit = SUBJECT_ALIASES[key];
  if (hit) return hit;
  const direct = CANONICAL_SUBJECTS.find((s) => s.toLowerCase() === key);
  return direct ?? null;
}