import { prisma } from "../prisma.ts";
import { computeFreshness } from "./freshness.ts";

export type ProfileDataset = "indian" | "global";

export interface ProfileProgram {
  id: string;
  name: string;
  level: string | null;
  studyMode: string | null;
  duration: string | null;
  source: string;
  sourceUrl: string | null;
  verificationStatus: string;
  verifiedAt: Date | null;
  freshness: "CURRENT" | "RECENT" | "HISTORICAL" | "UNKNOWN";
  degreeName: string | null;
  specializationName: string | null;
}

export interface ProfileIdentity {
  id: string;
  name: string;
  dataset: ProfileDataset;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  type: string | null;
  institutionType: string | null;
  management: string | null;
  website: string | null;
  domains: string[] | null;
  webPages: string[] | null;
  qsRank: number | null;
  logoUrl: string | null;
}

export interface UniversityProfile {
  identity: ProfileIdentity;
  programs: {
    byDegree: Record<string, ProfileProgram[]>;
    all: ProfileProgram[];
    total: number;
    verifiedCount: number;
    hasVerified: boolean;
  };
  freshness: {
    overall: "CURRENT" | "RECENT" | "HISTORICAL" | "UNKNOWN";
    programFreshness: Record<string, "CURRENT" | "RECENT" | "HISTORICAL" | "UNKNOWN">;
  };
  // Student-context block (when applicable) — additive, not required for neutral profile
  studentContext?: {
    career?: { id: string; name: string } | null;
    education?: { degreeName: string | null; specializationName: string | null } | null;
    matchedProgram?: ProfileProgram | null;
    matchScore?: number | null;
    confidenceScore?: number | null;
    reasons?: string[] | null;
    pathwayChain?: string | null;
  } | null;
  // Explicit absence markers
  hasPrograms: boolean;
  hasVerifiedPrograms: boolean;
  isEmpty: boolean;
}

/**
 * Build a university profile as a READ VIEW over existing data.
 * Never modifies University, IndianInstitution, or Program records.
 * Shows what is known, what is verified, how fresh the evidence is.
 */
export async function getUniversityProfile(
  institutionId: string,
  dataset: ProfileDataset,
  ctx?: { careerId?: string; degreeId?: string; specializationId?: string; studentId?: string }
): Promise<UniversityProfile | null> {
  let identity: ProfileIdentity | null = null;
  let programs: ProfileProgram[] = [];

  if (dataset === "indian") {
    const inst = await prisma.indianInstitution.findUnique({
      where: { id: institutionId },
      select: {
        id: true, name: true, type: true, state: true, district: true, website: true,
        institutionType: true, management: true, location: true, aisheCode: true, source: true,
      },
    });
    if (!inst) return null;
    identity = {
      id: inst.id,
      name: inst.name,
      dataset: "indian",
      country: "India",
      state: inst.state || null,
      district: inst.district || null,
      city: inst.location || null,
      type: inst.type || null,
      institutionType: inst.institutionType || null,
      management: inst.management || null,
      website: inst.website || null,
      domains: null,
      webPages: inst.website ? [inst.website] : null,
      qsRank: null,
      logoUrl: null,
    };
    const progs = await prisma.program.findMany({
      where: { indianInstitutionId: institutionId },
      include: { degree: { select: { name: true } }, specialization: { select: { name: true } } },
      orderBy: [{ verificationStatus: "asc" }, { name: "asc" }],
      take: 100, // Bounded, paginated
    });
    programs = progs.map((p) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      studyMode: p.studyMode,
      duration: p.duration,
      source: p.source,
      sourceUrl: p.sourceUrl,
      verificationStatus: p.verificationStatus,
      verifiedAt: p.verifiedAt,
      freshness: computeFreshness(p.verifiedAt),
      degreeName: p.degree?.name || null,
      specializationName: p.specialization?.name || null,
    }));
  } else {
    const uni = await prisma.university.findUnique({
      where: { id: institutionId },
      select: {
        id: true, name: true, country: true, region: true, qsRank: true, logoUrl: true, domains: true, webPages: true, status: true, size: true, focus: true,
      },
    });
    if (!uni) return null;
    identity = {
      id: uni.id,
      name: uni.name,
      dataset: "global",
      country: uni.country || null,
      state: uni.region || null,
      district: null,
      city: uni.region || null,
      type: uni.status || null,
      institutionType: uni.focus || null,
      management: null,
      website: uni.webPages?.[0] || null,
      domains: uni.domains || null,
      webPages: uni.webPages || null,
      qsRank: uni.qsRank || null,
      logoUrl: uni.logoUrl || null,
    };
    const progs = await prisma.program.findMany({
      where: { universityId: institutionId },
      include: { degree: { select: { name: true } }, specialization: { select: { name: true } } },
      orderBy: [{ verificationStatus: "asc" }, { name: "asc" }],
      take: 100,
    });
    programs = progs.map((p) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      studyMode: p.studyMode,
      duration: p.duration,
      source: p.source,
      sourceUrl: p.sourceUrl,
      verificationStatus: p.verificationStatus,
      verifiedAt: p.verifiedAt,
      freshness: computeFreshness(p.verifiedAt),
      degreeName: p.degree?.name || null,
      specializationName: p.specialization?.name || null,
    }));
  }

  // Group programs by Degree
  const byDegree: Record<string, ProfileProgram[]> = {};
  for (const prog of programs) {
    const key = prog.degreeName || "Other";
    if (!byDegree[key]) byDegree[key] = [];
    byDegree[key].push(prog);
  }

  const verifiedCount = programs.filter((p) => p.verificationStatus === "VERIFIED").length;
  const hasVerified = verifiedCount > 0;
  const hasPrograms = programs.length > 0;

  // Overall freshness: most recent verifiedAt among verified programs, or UNKNOWN if none
  let overall: "CURRENT" | "RECENT" | "HISTORICAL" | "UNKNOWN" = "UNKNOWN";
  if (hasVerified) {
    const verifiedFreshness = programs.filter((p) => p.verificationStatus === "VERIFIED").map((p) => computeFreshness(p.verifiedAt));
    if (verifiedFreshness.includes("CURRENT")) overall = "CURRENT";
    else if (verifiedFreshness.includes("RECENT")) overall = "RECENT";
    else if (verifiedFreshness.includes("HISTORICAL")) overall = "HISTORICAL";
  }

  // Student-context block (when applicable) — reuse Phase 16 match result, no fork
  let studentContext: UniversityProfile["studentContext"] = null;
  if (ctx?.studentId && (ctx.careerId || ctx.degreeId || ctx.specializationId)) {
    // Use the same matching logic as student API — no separate counselor logic
    const { getUniversityMatchForInstitution } = await import("../university-matching/engine.ts");
    const datasetForMatch = identity.dataset;
    const detail = await getUniversityMatchForInstitution(ctx.studentId, institutionId, {
      careerId: ctx.careerId,
      degreeId: ctx.degreeId,
      specializationId: ctx.specializationId,
      dataset: datasetForMatch,
    });
    if (detail) {
      const matchedProgram = programs.find((p) => p.verificationStatus === "VERIFIED" && p.degreeName === detail.educationContext?.degreeName) || null;
      const pathwayChain = detail.careerContext && detail.educationContext
        ? `Career: ${detail.careerContext.careerName} → Education: ${detail.educationContext.degreeName || "Not available"}${detail.educationContext.specializationName ? ` / ${detail.educationContext.specializationName}` : ""} → Program: ${matchedProgram?.name || "Not yet verified"} → Institution: ${identity.name}`
        : null;
      studentContext = {
        career: detail.careerContext ? { id: detail.careerContext.careerId, name: detail.careerContext.careerName } : null,
        education: detail.educationContext ? { degreeName: detail.educationContext.degreeName || null, specializationName: detail.educationContext.specializationName || null } : null,
        matchedProgram,
        matchScore: detail.result.matchScore,
        confidenceScore: detail.result.confidence,
        reasons: detail.result.reasons,
        pathwayChain,
      };
    }
  }

  return {
    identity: identity!,
    programs: {
      byDegree,
      all: programs,
      total: programs.length,
      verifiedCount,
      hasVerified,
    },
    freshness: {
      overall,
      programFreshness: Object.fromEntries(programs.map((p) => [p.id, p.freshness])),
    },
    studentContext,
    hasPrograms,
    hasVerifiedPrograms: hasVerified,
    isEmpty: !hasPrograms,
  };
}
