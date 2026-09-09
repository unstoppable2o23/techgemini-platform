/**
 * Phase 28 — deterministic program normalization.
 *
 * Maps the stored AcademicProgram / Program level strings to a canonical
 * qualification WITHOUT collapsing Diploma / Bachelor's / Master's / Doctoral /
 * Professional / Certificate into one label, and attaches the education-stage
 * family + a discipline derived from the stored category.
 */
import type {
  Discipline,
  ProgramQualification,
  QualificationKind,
  QualificationLevel,
  AdmissionInfo,
} from "./types.ts";

const QUAL: Record<string, { name: string; kind: QualificationKind; level: QualificationLevel }> = {
  diploma: { name: "Diploma", kind: "DIPLOMA", level: "DIPLOMA" },
  certificate: { name: "Certificate", kind: "CERTIFICATE", level: "SCHOOL" },
  "bachelor's": { name: "Bachelor's Degree", kind: "BACHELORS", level: "UNDERGRADUATE" },
  bachelors: { name: "Bachelor's Degree", kind: "BACHELORS", level: "UNDERGRADUATE" },
  undergraduate: { name: "Bachelor's Degree", kind: "BACHELORS", level: "UNDERGRADUATE" },
  "professional degree": { name: "Professional Degree", kind: "PROFESSIONAL_DEGREE", level: "UNDERGRADUATE" },
  "master's": { name: "Master's Degree", kind: "MASTERS", level: "POSTGRADUATE" },
  masters: { name: "Master's Degree", kind: "MASTERS", level: "POSTGRADUATE" },
  postgraduate: { name: "Postgraduate Degree", kind: "MASTERS", level: "POSTGRADUATE" },
  "postgraduate diploma": { name: "Postgraduate Diploma", kind: "POSTGRADUATE_DIPLOMA", level: "POSTGRADUATE" },
  doctoral: { name: "Doctoral Degree", kind: "DOCTORAL", level: "DOCTORAL" },
};

/** Normalize the raw `level` string to a canonical qualification. */
export function normalizeQualification(level: string | null | undefined): ProgramQualification | null {
  if (!level) return null;
  const key = level.trim().toLowerCase();
  const hit = QUAL[key] ?? QUAL[key.replace(/\s+/g, " ")];
  if (hit) return { name: hit.name, kind: hit.kind, level: hit.level };
  // Fallback: inject "degree" token variants that appear in data.
  for (const [k, v] of Object.entries(QUAL)) {
    if (key.includes(k)) return { name: v.name, kind: v.kind, level: v.level };
  }
  return null;
}

export function qualificationKindOf(level: string | null | undefined): QualificationKind | null {
  return normalizeQualification(level)?.kind ?? null;
}

export function qualificationLevelOf(level: string | null | undefined): QualificationLevel | null {
  return normalizeQualification(level)?.level ?? null;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DISCIPLINE_ID: Record<string, string> = {
  engineering: "engineering",
  healthcare: "healthcare",
  business: "business",
  technology: "technology",
  humanities: "humanities",
  "social sciences": "social-sciences",
  design: "design",
  media: "media",
  "life sciences": "life-sciences",
  agriculture: "agriculture",
  quantitative: "quantitative",
  hospitality: "hospitality",
  education: "education",
  environment: "environment",
  law: "law",
  architecture: "architecture",
  sports: "sports",
};

export function disciplineOf(category: string | null | undefined): Discipline {
  const raw = (category ?? "").trim();
  if (!raw) return { id: "other", name: "Other", category: null };
  const key = raw.toLowerCase();
  return {
    id: DISCIPLINE_ID[key] ?? slugify(raw) ?? "other",
    name: raw,
    category: raw,
  };
}

export function educationStageFitOf(level: string | null | undefined): string[] {
  const q = normalizeQualification(level);
  if (!q) return [];
  switch (q.kind) {
    case "DIPLOMA":
      return ["Class 10 / Class 12 — Technical route (Diploma / Polytechnic)", "Class 12 — direct diploma entry"];
    case "CERTIFICATE":
      return ["Class 10", "Class 12", "Any prior qualification"];
    case "BACHELORS":
      return ["Class 12 → Undergraduate"];
    case "PROFESSIONAL_DEGREE":
      return ["Class 12 → Undergraduate (professional course)"];
    case "MASTERS":
    case "POSTGRADUATE_DIPLOMA":
      return ["Undergraduate → Postgraduate"];
    case "DOCTORAL":
      return ["Postgraduate → Doctoral"];
    default:
      return [];
  }
}

export function nextStepOf(
  level: string | null | undefined,
  admission: AdmissionInfo | null
): string {
  const q = normalizeQualification(level);
  const kind = q?.kind ?? null;
  if (kind === "DIPLOMA") {
    return "Apply for the diploma / polytechnic route after Class 10 or Class 12 — a diploma is not a B.E./B.Tech degree.";
  }
  if (admission?.entranceExam) {
    return `Prepare for the national entrance route (${admission.entranceExam}) and apply to institutions offering this program.`;
  }
  if (kind === "BACHELORS" || kind === "PROFESSIONAL_DEGREE") {
    return "Shortlist institutions that offer this program and confirm their admission requirements.";
  }
  if (kind === "MASTERS" || kind === "POSTGRADUATE_DIPLOMA") {
    return "Confirm the undergraduate prerequisites and apply to institutions offering this program.";
  }
  if (kind === "DOCTORAL") {
    return "Complete the required postgraduate qualification and apply for doctoral admission.";
  }
  return "Confirm admission requirements with the institutions that offer this program.";
}