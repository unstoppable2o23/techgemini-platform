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
export async function getCandidateSet(opts: {
  careerId?: string;
  degreeId?: string;
  specializationId?: string;
}): Promise<CandidateSet> {
  let resp: Awaited<ReturnType<typeof getInstitutionsForCareer>> | null = null;

  if (opts.specializationId) {
    resp = await getInstitutionsForSpecialization(opts.specializationId, { limit: CANDIDATE_CAP });
  } else if (opts.degreeId) {
    resp = await getInstitutionsForDegrees([opts.degreeId], { limit: CANDIDATE_CAP });
  } else if (opts.careerId) {
    resp = await getInstitutionsForCareer(opts.careerId, { limit: CANDIDATE_CAP });
  }

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

  return toCandidate(
    {
      id: rec.id,
      name: rec.name,
      dataset,
      ...base,
    },
    basis
  );
}
