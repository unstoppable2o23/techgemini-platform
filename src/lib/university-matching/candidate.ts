import { prisma } from "../prisma.ts";
import {
  getInstitutionsForCareer,
  getInstitutionsForDegrees,
  getInstitutionsForSpecialization,
  deriveInstitutionTypeTokens,
} from "../education-institutions/service.ts";
import type { InstitutionCandidate, MappingBasis } from "./types.ts";

export const CANDIDATE_CAP = 200;

export interface CandidateSet {
  candidates: InstitutionCandidate[];
  total: number;
  mappingBasis: MappingBasis;
  disclaimer: string | null;
}

function toCandidate(
  r: {
    id: string;
    name: string;
    dataset: "indian" | "global";
    type: string | null;
    state: string | null;
    district: string | null;
    website: string | null;
    institutionType: string | null;
    universityName: string | null;
    country: string | null;
    qsRank: number | null;
  },
  basis: MappingBasis
): InstitutionCandidate {
  return {
    id: r.id,
    name: r.name,
    dataset: r.dataset,
    type: r.type,
    state: r.state,
    district: r.district,
    website: r.website,
    institutionType: r.institutionType,
    universityName: r.universityName,
    country: r.country,
    qsRank: r.qsRank,
    mappingBasis: basis,
  };
}

/**
 * STEP 3: candidate institutions come from the Phase 6 integration layer.
 * We cap retrieval to CANDIDATE_CAP to avoid loading the entire institution
 * database into memory (STEP 33). The shortlist is then ranked within this set.
 */
async function getVerifiedProgramCandidates(opts: {
  careerId?: string;
  degreeId?: string;
  specializationId?: string;
}): Promise<CandidateSet | null> {
  let degreeIds: string[] = [];
  let specializationIds: string[] = [];

  if (opts.specializationId) {
    specializationIds = [opts.specializationId];
    const spec = await prisma.specialization.findUnique({ where: { id: opts.specializationId }, select: { degreeId: true } });
    if (spec) degreeIds = [spec.degreeId];
  } else if (opts.degreeId) {
    degreeIds = [opts.degreeId];
  } else if (opts.careerId) {
    const pathways = await prisma.careerEducationPathway.findMany({
      where: { careerId: opts.careerId, type: "DEGREE_PATHWAY", degreeId: { not: null } },
      select: { degreeId: true, specializationId: true },
    });
    degreeIds = pathways.map((p) => p.degreeId!).filter(Boolean);
    specializationIds = pathways.map((p) => p.specializationId!).filter(Boolean);
  } else {
    return null;
  }

  if (degreeIds.length === 0 && specializationIds.length === 0) return null;

  const where: any = {
    verificationStatus: "VERIFIED",
    OR: [],
  };
  if (degreeIds.length) where.OR.push({ degreeId: { in: degreeIds } });
  if (specializationIds.length) where.OR.push({ specializationId: { in: specializationIds } });
  if (where.OR.length === 0) return null;

  const programs = await prisma.program.findMany({
    where,
    include: {
      degree: { select: { name: true } },
      specialization: { select: { name: true } },
      university: { select: { id: true, name: true, country: true, qsRank: true } },
      indianInstitution: { select: { id: true, name: true, type: true, state: true, district: true, website: true, institutionType: true, universityName: true } },
    },
    take: CANDIDATE_CAP,
    orderBy: { verifiedAt: "desc" },
  });

  if (programs.length === 0) return null;

  const candidates: InstitutionCandidate[] = programs.map((p) => {
    const isGlobal = !!p.university;
    const base = isGlobal
      ? {
          id: p.university!.id,
          name: p.university!.name,
          dataset: "global" as const,
          type: null,
          state: null,
          district: null,
          website: null,
          institutionType: null,
          universityName: null,
          country: p.university!.country,
          qsRank: p.university!.qsRank,
        }
      : {
          id: p.indianInstitution!.id,
          name: p.indianInstitution!.name,
          dataset: "indian" as const,
          type: p.indianInstitution!.type,
          state: p.indianInstitution!.state,
          district: p.indianInstitution!.district,
          website: p.indianInstitution!.website,
          institutionType: p.indianInstitution!.institutionType,
          universityName: p.indianInstitution!.universityName,
          country: null,
          qsRank: null,
        };
    return {
      ...toCandidate(base, "verified-program"),
      program: {
        id: p.id,
        name: p.name,
        degreeName: p.degree?.name || null,
        specializationName: p.specialization?.name || null,
        level: p.level,
        verificationStatus: p.verificationStatus,
        sourceUrl: p.sourceUrl,
        verifiedAt: p.verifiedAt,
      },
    };
  });

  // Deduplicate by institution id (one institution may have multiple programs, keep first)
  const dedup = new Map<string, InstitutionCandidate>();
  for (const c of candidates) {
    if (!dedup.has(c.id)) dedup.set(c.id, c);
  }
  const unique = [...dedup.values()];

  return {
    candidates: unique,
    total: unique.length,
    mappingBasis: "verified-program",
    disclaimer: "Verified program offerings — confirmed via official institution sources.",
  };
}

const VERIFIED_THRESHOLD = 10;
const CURATED_THRESHOLD = 10;

export async function getCandidateSet(opts: {
  careerId?: string;
  degreeId?: string;
  specializationId?: string;
}): Promise<CandidateSet> {
  // Tier 1: VERIFIED PROGRAM
  const verified = await getVerifiedProgramCandidates(opts);
  if (verified && verified.candidates.length >= VERIFIED_THRESHOLD) {
    return verified;
  }

  // Tier 2: CURATED EducationInstitutionMapping
  let resp: Awaited<ReturnType<typeof getInstitutionsForCareer>> | null = null;
  if (opts.specializationId) {
    resp = await getInstitutionsForSpecialization(opts.specializationId, { limit: CANDIDATE_CAP });
  } else if (opts.degreeId) {
    resp = await getInstitutionsForDegrees([opts.degreeId], { limit: CANDIDATE_CAP });
  } else if (opts.careerId) {
    resp = await getInstitutionsForCareer(opts.careerId, { limit: CANDIDATE_CAP });
  }

  if (resp && resp.mappingBasis === "curated") {
    const curatedCandidates = resp.institutions.map((r) => toCandidate(r, resp!.mappingBasis));
    if (verified) {
      // Merge verified + curated, dedup, respect thresholds
      const merged = [...verified.candidates];
      const seen = new Set(merged.map((c) => c.id));
      for (const c of curatedCandidates) {
        if (!seen.has(c.id) && merged.length < CANDIDATE_CAP) {
          merged.push(c);
          seen.add(c.id);
        }
      }
      if (merged.length >= VERIFIED_THRESHOLD) {
        return { candidates: merged, total: merged.length, mappingBasis: "verified-program", disclaimer: verified.disclaimer };
      }
      // If still below threshold, add category fallback below
      if (merged.length < CURATED_THRESHOLD) {
        // will fall through to category
      } else {
        return { candidates: merged, total: merged.length, mappingBasis: "curated", disclaimer: resp.disclaimer };
      }
    } else {
      if (curatedCandidates.length >= CURATED_THRESHOLD) {
        return {
          candidates: curatedCandidates,
          total: resp.total,
          mappingBasis: resp.mappingBasis,
          disclaimer: resp.disclaimer,
        };
      }
      // If curated is small, fall through to include category as well
      // For now, return curated and let category be appended if needed below
      // To keep bounded, we will merge with category below
    }
  }

  // Tier 3: CATEGORY-BASED FALLBACK (only if verified+curated insufficient)
  // If we have verified, merge category as well to reach threshold
  if (verified) {
    // Need to get category candidates
    let categoryResp: Awaited<ReturnType<typeof getInstitutionsForCareer>> | null = null;
    if (opts.specializationId) {
      categoryResp = await getInstitutionsForSpecialization(opts.specializationId, { limit: CANDIDATE_CAP });
    } else if (opts.degreeId) {
      categoryResp = await getInstitutionsForDegrees([opts.degreeId], { limit: CANDIDATE_CAP });
    } else if (opts.careerId) {
      categoryResp = await getInstitutionsForCareer(opts.careerId, { limit: CANDIDATE_CAP });
    }
    if (categoryResp && categoryResp.mappingBasis === "institutionType-category") {
      const categoryCandidates = categoryResp.institutions.map((r) => toCandidate(r, categoryResp!.mappingBasis));
      const merged = [...verified.candidates];
      const seen = new Set(merged.map((c) => c.id));
      // Add curated if we had it
      if (resp && resp.mappingBasis === "curated") {
        for (const c of resp.institutions.map((r) => toCandidate(r, resp!.mappingBasis))) {
          if (!seen.has(c.id) && merged.length < CANDIDATE_CAP) {
            merged.push(c);
            seen.add(c.id);
          }
        }
      }
      for (const c of categoryCandidates) {
        if (!seen.has(c.id) && merged.length < CANDIDATE_CAP) {
          merged.push(c);
          seen.add(c.id);
        }
      }
      return {
        candidates: merged.slice(0, CANDIDATE_CAP),
        total: merged.length,
        mappingBasis: "verified-program",
        disclaimer: verified.disclaimer + " " + categoryResp.disclaimer,
      };
    }
    return verified;
  }

  // No verified — return whatever we have (curated or category)
  if (!resp) {
    return { candidates: [], total: 0, mappingBasis: "none", disclaimer: "No education pathway context provided." };
  }

  return {
    candidates: resp.institutions.map((r) => toCandidate(r, resp!.mappingBasis)),
    total: resp.total,
    mappingBasis: resp.mappingBasis,
    disclaimer: resp.disclaimer,
  };
}

/**
 * Fetch a single institution by id + dataset and resolve its mapping basis.
 * Used by the detail endpoint. Curated basis is detected from the mapping table;
 * otherwise (for Indian institutions) category basis is derived from the
 * education degree text vs the institution type. Global institutions without a
 * curated mapping are "none" (category discovery only applies to Indian data).
 */
export async function getSingleCandidate(
  id: string,
  dataset: "indian" | "global",
  degreeName?: string | null
): Promise<InstitutionCandidate | null> {
  let rec: any = null;
  if (dataset === "indian") {
    rec = await prisma.indianInstitution.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        state: true,
        district: true,
        website: true,
        institutionType: true,
        universityName: true,
      },
    });
  } else {
    rec = await prisma.university.findUnique({
      where: { id },
      select: { id: true, name: true, country: true, qsRank: true },
    });
  }
  if (!rec) return null;

  let basis: MappingBasis = "none";
  let program: any = null;
  // Tier 1: verified program
  if (degreeName) {
    const deg = await prisma.degree.findFirst({ where: { name: degreeName } });
    if (deg) {
      const progWhere: any = {
        verificationStatus: "VERIFIED",
        degreeId: deg.id,
        ...(dataset === "indian" ? { indianInstitutionId: id } : { universityId: id }),
      };
      program = await prisma.program.findFirst({ where: progWhere, include: { degree: true, specialization: true } });
      if (program) basis = "verified-program";
    }
  }
  if (basis === "none") {
    const curated = await prisma.educationInstitutionMapping.findFirst({
      where: dataset === "indian" ? { indianInstitutionId: id } : { universityId: id },
    });
    if (curated) {
      basis = "curated";
    } else if (dataset === "indian" && degreeName) {
      const tokens = deriveInstitutionTypeTokens(degreeName);
      const instType = (rec.institutionType || "").toLowerCase();
      if (tokens.length && tokens.some((t) => instType.includes(t.toLowerCase()))) {
        basis = "institutionType-category";
      }
    }
  }

  const base = dataset === "indian"
    ? {
        type: rec.type,
        state: rec.state,
        district: rec.district,
        website: rec.website,
        institutionType: rec.institutionType,
        universityName: rec.universityName,
        country: null,
        qsRank: null,
      }
    : {
        type: null,
        state: null,
        district: null,
        website: null,
        institutionType: null,
        universityName: null,
        country: rec.country,
        qsRank: rec.qsRank,
      };

  const candidate = toCandidate(
    {
      id: rec.id,
      name: rec.name,
      dataset,
      ...base,
    },
    basis
  );
  if (program && basis === "verified-program") {
    candidate.program = {
      id: program.id,
      name: program.name,
      degreeName: program.degree?.name || null,
      specializationName: program.specialization?.name || null,
      level: program.level,
      verificationStatus: program.verificationStatus,
      sourceUrl: program.sourceUrl,
      verifiedAt: program.verifiedAt,
    };
  }
  return candidate;
}
