/**
 * Phase 28 — institution-level program availability.
 *
 * The `Program` table holds institution-offered, source-verified programs
 * (80 rows; PRE-VERIFIED at source ). We NEVER add rows to that table here —
 * availability is read-only intelligence layered over it.
 *
 * Rules:
 *  - Absent evidence -> explicit "Program availability not verified" state.
 *  - Matching an AcademicProgram (career-catalog) to an institution-offered
 *    Program is conservative, token-core based, and never edits rows.
 *  - Freshness is computed at read time from verifiedAt; stale data shows WITH
 *    its age, never silently.
 */
import type { PrismaClient } from "@prisma/client";
import type {
  ProgramAvailability,
  ProgramAvailabilityRow,
  Provenance,
  InstitutionKind,
} from "./types.ts";
import { normalizeQualification } from "./normalize.ts";
import { computeFreshness } from "../university-profile/freshness.ts";

export type { InstitutionKind };

const QUALIFICATION_SUFFIXES = [
  "(bachelor's)",
  "(bachelors)",
  "(master's)",
  "(masters)",
  "(postgraduate)",
  "(doctorate)",
  "(phd)",
  "(mba)",
  "(bba)",
  "(bca)",
  "(mca)",
  "(honours)",
  "(hons.)",
  "(b.arch)",
  "(b.tech)",
  "(mbbs)",
  "(bds)",
  "(llb)",
];

const PROGRAM_NAME_PREFIX_TOKENS = [
  "b.tech",
  "b.e.",
  "b.sc",
  "b.s.",
  "b.a.",
  "b.des",
  "b.arch",
  "b.com",
  "b.b.a",
  "b.c.a",
  "l.l.b.",
  "m.eng",
  "m.tech",
  "m.sc",
  "m.a.",
  "m.b.a",
  "m.c.a",
  "m.p.hil",
  "pgp",
  "pgdm",
  "diploma",
  "advanced diploma",
];

function normalizeProgramCore(raw: string): string {
  let v = raw.trim().toLowerCase().replace(/\s+/g, " ");
  for (const s of QUALIFICATION_SUFFIXES) v = v.replace(s, " ");
  for (const t of PROGRAM_NAME_PREFIX_TOKENS) {
    // Only strip when it appears at the FRONT (e.g. "b.tech computer science").
    v = v.replace(new RegExp(`^${t.replace(/\./g, "\\.")}(\\s|$)`), " ");
    v = v.replace(new RegExp(`\\s${t.replace(/\./g, "\\.")}(\\s|$)`), " ");
  }
  v = v.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return v;
}

function tokenSet(value: string): Set<string> {
  const core = normalizeProgramCore(value);
  const tokens = core.split(" ").filter((t) => t.length >= 2);
  const LITERAL_STOP = new Set([
    "and", "of", "for", "the", "in", "with", "de", "la", "engineering", "science",
    "technology", "sciences", "studies", "management", "computing",
  ]);
  return new Set(tokens.filter((t) => !LITERAL_STOP.has(t)));
}

/** Conservative overlap test: AcademicProgram core ⊂ Program core tokens. */
export function coversAcademicProgram(
  academicProgramName: string,
  institutionProgramName: string
): boolean {
  const ap = tokenSet(academicProgramName);
  const ip = tokenSet(institutionProgramName);
  if (ap.size === 0 || ip.size === 0) return false;
  let matched = 0;
  for (const t of ap) if (ip.has(t)) matched++;
  // Require the majority of the academic program's distinctive tokens.
  return matched >= Math.max(1, Math.ceil(ap.size * 0.6));
}

function toProvenance(p: {
  source: string | null;
  sourceUrl: string | null;
  verificationStatus: string | null;
  verifiedAt: Date | null;
}): Provenance {
  return {
    source: p.source ?? "official-website",
    sourceUrl: p.sourceUrl,
    verificationStatus: p.verificationStatus ?? "UNVERIFIED",
    verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
  };
}

/**
 * Institution-offered, source-verified programs for one institution.
 * Bound to 100 rows (the catalog is 80, so this is a safety ceiling).
 */
export async function getInstitutionOfferedPrograms(
  prisma: PrismaClient,
  input: { institutionId: string; kind: InstitutionKind }
): Promise<ProgramAvailabilityRow[]> {
  const base = {
    where:
      input.kind === "INDIAN"
        ? { indianInstitutionId: input.institutionId }
        : { universityId: input.institutionId },
    take: 100,
    orderBy: { name: "asc" as const },
    include: {
      degree: { select: { name: true } },
      specialization: { select: { name: true } },
      indianInstitution: {
        select: { id: true, name: true, state: true, institutionType: true },
      },
      university: { select: { id: true, name: true, country: true } },
    },
  };

  const rows =
    input.kind === "INDIAN"
      ? await prisma.program.findMany(base as any)
      : await prisma.program.findMany(base as any);

  return rows.map((r: any) => ({
    programId: r.id,
    programName: r.name ?? "Untitled program",
    qualification: normalizeQualification(r.level as string | null),
    specializationName: r.specialization?.name ?? null,
    studyMode: r.studyMode ?? null,
    duration: r.duration ?? null,
    provenance: toProvenance(r),
    freshness: computeFreshness((r.verifiedAt as Date | null) ?? null),
  }));
}

export async function getProgramAvailability(
  prisma: PrismaClient,
  input: { institutionId: string; kind: InstitutionKind }
): Promise<ProgramAvailability> {
  const rows = await getInstitutionOfferedPrograms(prisma, input);
  const verifiedRows = rows.filter((r) => r.provenance.verificationStatus === "VERIFIED");
  const qualificationCoverage = Array.from(
    new Set(rows.map((r) => r.qualification?.name).filter((v): v is string => !!v))
  ).sort();
  return {
    rows,
    verifiedCount: verifiedRows.length,
    hasVerified: verifiedRows.length > 0,
    qualificationCoverage,
    state: rows.length === 0
      ? "NOT_VERIFIED"
      : verifiedRows.length > 0
        ? "VERIFIED"
        : "PARTIAL",
  };
}

/** Availability text block for the university profile. */
export function availabilityNote(availability: ProgramAvailability): {
  state: "VERIFIED" | "PARTIAL" | "NOT_VERIFIED";
  title: string;
  body: string;
  css: string | null;
} {
  if (availability.state === "VERIFIED") {
    return {
      state: "VERIFIED",
      title: `Program availability verified · ${availability.verifiedCount} offered program${availability.verifiedCount === 1 ? "" : "s"}`,
      body: "Offered programs are tied to official sources with a verified date. Advisory: dates/cutoffs/seats are never claimed in this app — confirm admission details with official pages.",
      css: null,
    };
  }
  if (availability.state === "PARTIAL") {
    return {
      state: "PARTIAL",
      title: "Program availability partially verified",
      body: "Some institution-offered programs exist but could not be tied to a verified source. Where unverified, the app says so instead of guessing.",
      css: null,
    };
  }
  return {
    state: "NOT_VERIFIED",
    title: "Program availability not verified",
    body: "No institution-offered programs are linked to a verified source for this institution, so availability claims are withheld rather than invented.",
    css: "dst-error",
  };
}