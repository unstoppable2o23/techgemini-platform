/**
 * Phase 28 — admission / entrance intelligence for programs.
 *
 * Source-of-truth rule:
 *  - Medical programs reuse the already-verified Medical education registry
 *    (entrance + sources + lastReviewed) so we never duplicate or drift.
 *  - Non-medical programs only get a conservative, clearly-worded admission
 *    TYPE when the national pattern is well established (or "varies by
 *    institution"). We NEVER hardcode deadlines, cutoffs, seats, or a single
 *    universal exam, and never claim every program shares one entrance.
 */
import type { AdmissionInfo } from "./types.ts";
import {
  getMedicalDisciplineForCareerSlug,
  MEDICAL_DISCIPLINES,
  MEDICAL_EDUCATION_LAST_REVIEWED,
} from "../medical-education/registry.ts";

/** Program-name tokens → medical-registry discipline slug. */
const MEDICAL_DISCIPLINE_TOKENS: Array<{ tokens: string[]; slug: string; label: string }> = [
  { tokens: ["mbbs", "mbchb", "medicine (mbbs)"], slug: "medicine", label: "Medicine (MBBS)" },
  { tokens: ["bds", "dental", "dentistry"], slug: "dentistry", label: "Dentistry (BDS)" },
  { tokens: ["pharmacy", "pharma", "d.pharm", "b.pharm", "pharm.d"], slug: "pharmacy", label: "Pharmacy" },
  { tokens: ["nursing", "b.sc nursing", "gnm"], slug: "nursing", label: "Nursing" },
  { tokens: ["physiotherapy", "bpt"], slug: "physiotherapy", label: "Physiotherapy (BPT)" },
];

function medicalInfo(programName: string): (typeof MEDICAL_DISCIPLINE_TOKENS)[number] | null {
  const name = programName.toLowerCase();
  for (const entry of MEDICAL_DISCIPLINE_TOKENS) {
    if (entry.tokens.some((t) => name.includes(t))) return entry;
  }
  return null;
}

// Registry disciplines are publically keyed by career slug AND by their stable
// discipline id (e.g. pharmacy's careerSlugs are pharmacology/... but the
// discipline id is "pharmacy"). Resolve by id as the fallback so token→slug
// mappings like pharmacy/nursing/physiotherapy still reach the registry.
const DISCIPLINE_BY_ID = new Map(MEDICAL_DISCIPLINES.map((d) => [d.id, d]));

function fromRegistry(slug: string): Omit<AdmissionInfo, "note"> | null {
  const d = getMedicalDisciplineForCareerSlug(slug) ?? DISCIPLINE_BY_ID.get(slug) ?? null;
  if (!d) return null;
  const primary = d.sources?.[0];
  return {
    entranceExam: d.entrance ? d.entrance : null,
    admissionType: d.regulatedEntrance ? "National entrance route (see note)" : "Institution / state-level routes (see note)",
    applicableQualification: d.schoolSubjects?.length ? `Class 12 subjects: ${d.schoolSubjects.join(", ")}` : null,
    source: {
      label: primary?.name ?? "Medical education registry",
      lastReviewed: d.lastReviewed ?? MEDICAL_EDUCATION_LAST_REVIEWED,
    },
  };
}

/**
 * Admission intelligence for a program. Returns null when nothing is known —
 * the UI must then say "verify with official sources", never guess.
 */
export function getAdmissionInfo(input: {
  programName: string;
  level: string | null | undefined;
  category: string | null | undefined;
}): AdmissionInfo | null {
  const name = (input.programName ?? "").toLowerCase();

  const medical = medicalInfo(name);
  if (medical) {
    const reg = fromRegistry(medical.slug);
    if (reg) {
      return {
        ...reg,
        note: `Admission detail sourced from the Medical education registry (reviewed ${reg.source?.lastReviewed ?? "on a prior review date"}). Confirm eligibility for your admission year with official bodies — dates and cutoffs are never shown.`,
      };
    }
  }

  const category = (input.category ?? "").toLowerCase();
  const level = (input.level ?? "").toLowerCase();

  if (category === "law") {
    return {
      entranceExam: null,
      admissionType: "Varies by institution (CLAT / CUET-UG / state exams)",
      applicableQualification: "Class 12, unless the institution specifies otherwise",
      source: null,
      note: "Law admissions follow institution-specific routes; verify the notified entrance and eligibility for your admission year.",
    };
  }

  if (category === "engineering" || category === "technology") {
    if (["diploma", "certificate"].includes(level)) {
      return {
        entranceExam: null,
        admissionType: "Institution / state-level admissions for the technical route",
        applicableQualification: "Class 10 or Class 12, per the institution's rule",
        source: null,
        note: "A diploma or certificate is separate from a B.E./B.Tech degree. Confirm the institution's notified admission route.",
      };
    }
    return {
      entranceExam: null,
      admissionType: "Varies by institution (national JEE-route where the program participates)",
      applicableQualification: "Class 12 (Maths + Science stream where required)",
      source: null,
      note: "Not every engineering program shares the same exam — confirm each institution's notified entrance route for your admission year.",
    };
  }

  if (level.includes("master") || level.includes("postgraduate")) {
    return {
      entranceExam: null,
      admissionType: "Varies by institution (national/state university entrances and merit)",
      applicableQualification: "Relevant undergraduate qualification",
      source: null,
      note: "Postgraduate admission eligibility and entrances vary by institution; verify with the official admissions source.",
    };
  }

  if (category === "business") {
    return {
      entranceExam: null,
      admissionType: "Varies by institution (CAT/XAT/GMAT-style or institution-specific tests)",
      applicableQualification: "Undergraduate qualification, per the institution's rule",
      source: null,
      note: "Management program admissions differ across institutes; verify the notified entrance route.",
    };
  }

  return null;
}