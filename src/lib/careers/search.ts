/**
 * Phase 23.3 — Career Library search visibility layer.
 *
 * The Career Library client filters careers locally (name/title/short description
 * substring) and the API mirrors that with a DB `contains` lookup. That pipeline
 * could not surface canonical careers for the everyday terms students actually
 * type ("doctor" for Medicine, "pharmacy" for Pharmacology, "optometrist" for
 * Optometry, and the broad "medical" query which never matched Medicine itself).
 *
 * This module is the single shared matcher for BOTH the client grid and the API
 * route so search behaviour is deterministic and testable:
 *   1. substring match on name / title / shortDescription / subcategory / slug,
 *      plus an exact (case-insensitive) category match;
 *   2. curated alias terms -> canonical career slugs (no duplicate careers);
 *   3. healthcare broad terms ("medical" / "healthcare") -> every active
 *      "Healthcare & Medicine" career.
 *
 * It does not add or rename careers — it only fixes how existing careers are
 * found. Matching is case-insensitive and whitespace-normalised.
 */

export const HEALTHCARE_CATEGORY = "Healthcare & Medicine";

/** Broad terms that mean "show me the healthcare careers". */
const HEALTHCARE_BROAD_TERMS = new Set(["medical", "healthcare", "health-care", "health care"]);

/**
 * Curated query terms -> canonical career slugs. Every target exists in the
 * catalog (no aliases invent or duplicate careers).
 */
const CAREER_SEARCH_ALIASES: Record<string, string[]> = {
  doctor: ["medicine", "surgeon"],
  doctors: ["medicine", "surgeon"],
  physician: ["medicine", "surgeon"],
  physicians: ["medicine", "surgeon"],
  nurse: ["nursing"],
  nurses: ["nursing"],
  pharmacist: ["pharmacology"],
  pharmacists: ["pharmacology"],
  pharmacy: ["pharmacology"],
  pharma: ["pharmacology"],
  dentist: ["dentistry"],
  dentists: ["dentistry"],
  dental: ["dentistry"],
  optometrist: ["optometry"],
  optometrists: ["optometry"],
  optician: ["optometry"],
  physiotherapist: ["physiotherapy"],
  physiotherapists: ["physiotherapy"],
  physio: ["physiotherapy"],
  "lab technician": ["medical-laboratory-sciences", "phlebotomist"],
  "lab technologist": ["medical-laboratory-sciences", "phlebotomist"],
  "medical lab": ["medical-laboratory-sciences"],
  laboratory: ["medical-laboratory-sciences", "biomedical-scientist"],
  "medical imaging": ["radiology-technology", "sonographer"],
  radiologist: ["radiology-technology"],
  radiologists: ["radiology-technology"],
  radiography: ["radiology-technology"],
  "x-ray": ["radiology-technology"],
  sonographer: ["sonographer"],
  ultrasound: ["sonographer"],
  "public health": ["public-health", "epidemiologist", "health-educator"],
  epidemiologist: ["epidemiologist"],
  "health educator": ["health-educator"],
  "hospital administrator": ["hospital-administration"],
  "hospital administration": ["hospital-administration"],
  "healthcare manager": ["hospital-administration", "health-informatics"],
  "healthcare management": ["hospital-administration", "health-informatics"],
  "health informatics": ["health-informatics"],
  biotech: ["biotechnology-research", "biomedical-scientist"],
  biotechnology: ["biotechnology-research"],
  "clinical researcher": ["clinical-research"],
  "clinical trial": ["clinical-research", "clinical-data-management"],
  "clinical trials": ["clinical-research", "clinical-data-management"],
  "emergency medical": ["paramedic", "medicine"],
  veterinary: ["veterinary-science"],
  vet: ["veterinary-science"],
  nutritionist: ["nutrition-and-dietetics"],
  dietician: ["nutrition-and-dietetics"],
  "genetic counsellor": ["genetic-counseling"],
  "genetic counselor": ["genetic-counseling"],
  audiologist: ["audiology"],
  "speech therapist": ["speech-language-pathology"],
};

export type CareerSearchRecord = {
  slug: string;
  name?: string | null;
  title?: string | null;
  shortDescription?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

/** Lowercase, trim and collapse internal whitespace. */
export function normalizeCareerQuery(raw: string): string {
  return (raw || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Canonical career slugs an exact-normalised query term should surface. */
export function expandCareerSearchAliases(query: string): string[] {
  const q = normalizeCareerQuery(query);
  if (!q) return [];
  return CAREER_SEARCH_ALIASES[q] ?? [];
}

/** True when the query is a healthcare broad term. */
export function isHealthcareBroadTerm(query: string): boolean {
  return HEALTHCARE_BROAD_TERMS.has(normalizeCareerQuery(query));
}

/**
 * Client-side matcher: does this career match the query? Used by the Career
 * Library grid (and unit-tested directly).
 */
export function careerMatchesQuery(career: CareerSearchRecord, rawQuery: string): boolean {
  const q = normalizeCareerQuery(rawQuery);
  if (!q) return true;

  const text = [career.name, career.title, career.shortDescription, career.subcategory, career.slug]
    .filter((f): f is string => !!f)
    .map((f) => f.toLowerCase());
  if (text.some((f) => f.includes(q))) return true;

  if (career.category && career.category.toLowerCase() === q) return true;

  const targets = expandCareerSearchAliases(q);
  if (targets.length) {
    if (targets.includes(career.slug)) return true;
    if (career.name && targets.includes(career.name.toLowerCase())) return true;
  }

  if (isHealthcareBroadTerm(q) && career.category === HEALTHCARE_CATEGORY) return true;

  return false;
}

/**
 * Server-side builder used by the API route: returns a Prisma `where.OR` array
 * for a search (name / title / shortDescription / category / subcategory, plus
 * alias slugs and the healthcare broad-category expansion). Returns undefined
 * for an empty query so callers can skip the `OR` entirely.
 */
export function buildCareerSearchWhere(rawQuery: string): Array<Record<string, unknown>> | undefined {
  const q = normalizeCareerQuery(rawQuery);
  if (!q) return undefined;

  const OR: Array<Record<string, unknown>> = [
    { name: { contains: q, mode: "insensitive" } },
    { title: { contains: q, mode: "insensitive" } },
    { shortDescription: { contains: q, mode: "insensitive" } },
    { category: { equals: q, mode: "insensitive" } },
    { subcategory: { contains: q, mode: "insensitive" } },
  ];

  const targets = expandCareerSearchAliases(q);
  if (targets.length) OR.push({ slug: { in: targets } });

  if (isHealthcareBroadTerm(q)) OR.push({ category: HEALTHCARE_CATEGORY });

  return OR;
}