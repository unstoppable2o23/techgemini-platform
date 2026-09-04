import { prisma } from "../prisma.ts";

export interface InstitutionResult {
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
}

export interface InstitutionQueryOptions {
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InstitutionResponse {
  institutions: InstitutionResult[];
  total: number;
  page: number;
  totalPages: number;
  verified: boolean;
  mappingBasis: "curated" | "institutionType-category" | "none";
  source: string;
  disclaimer: string | null;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

/**
 * Conservative, documented mapping from education-degree text to the
 * `institutionType` values present in the AISHE (IndianInstitution) dataset.
 *
 * IMPORTANT: This is a CATEGORY-level association only. It does NOT assert that
 * a specific institution offers a specific course. The results are returned with
 * `verified: false` and a transparency disclaimer (Phase 6 requirement: do not
 * fabricate course/program offerings).
 */
const FIELD_RULES: { tokens: string[]; types: string[] }[] = [
  {
    tokens: ["diploma"],
    types: ["Polytechnic"],
  },
  {
    tokens: ["engineering", "tech", "b.tech", "m.tech", "be ", "b.e.", "civil", "mechanical", "electrical", "electronics", "computer"],
    types: ["Technical"],
  },
  {
    tokens: ["mba", "management", "pgdm", "business administration"],
    types: ["PGDM"],
  },
  {
    tokens: ["pharm", "pharmacy"],
    types: ["Pharmacy"],
  },
  {
    tokens: ["b.ed", "bed", "education", "teaching", "teacher"],
    types: ["Teacher Training"],
  },
  {
    tokens: ["hotel", "hospitality", "catering"],
    types: ["Hotel Management"],
  },
  {
    tokens: ["nursing"],
    types: ["Nursing"],
  },
  {
    tokens: ["paramedical"],
    types: ["Paramedical"],
  },
  {
    tokens: ["ayurved"],
    types: ["Ayurvedic"],
  },
];

export function deriveInstitutionTypeTokens(degreeName: string): string[] {
  const text = ` ${(degreeName || "").toLowerCase()} `;
  const matched = new Set<string>();
  for (const rule of FIELD_RULES) {
    if (rule.tokens.some((t) => text.includes(t))) {
      rule.types.forEach((ty) => matched.add(ty));
    }
  }
  return [...matched];
}

function emptyResponse(page: number, limit: number, reason: string): InstitutionResponse {
  return {
    institutions: [],
    total: 0,
    page,
    totalPages: 0,
    verified: false,
    mappingBasis: "none",
    source: "none",
    disclaimer: reason,
  };
}

const CATEGORY_DISCLAIMER =
  "These institutions are related by category (institution type derived from the education pathway). Individual course/program offerings are NOT individually verified. Source: AISHE institution data.";

async function resolveCuratedMappings(
  degreeIds: string[],
  specializationIds: string[]
): Promise<InstitutionResponse | null> {
  const where: any = {
    OR: [
      { degreeId: { in: degreeIds } },
      { specializationId: { in: specializationIds } },
    ],
  };
  const mappings = await prisma.educationInstitutionMapping.findMany({ where });
  if (mappings.length === 0) return null;

  const indianIds = mappings.filter((m) => m.indianInstitutionId).map((m) => m.indianInstitutionId!);
  const globalIds = mappings.filter((m) => m.universityId).map((m) => m.universityId!);

  const [indian, global] = await Promise.all([
    indianIds.length
      ? prisma.indianInstitution.findMany({
          where: { id: { in: indianIds } },
          select: {
            id: true, name: true, type: true, state: true, district: true,
            website: true, institutionType: true, universityName: true,
          },
        })
      : Promise.resolve([]),
    globalIds.length
      ? prisma.university.findMany({
          where: { id: { in: globalIds } },
          select: { id: true, name: true, country: true, region: true, qsRank: true },
        })
      : Promise.resolve([]),
  ]);

  const institutions: InstitutionResult[] = [
    ...indian.map((r) => ({
      id: r.id, name: r.name, dataset: "indian" as const, type: r.type,
      state: r.state, district: r.district, website: r.website,
      institutionType: r.institutionType, universityName: r.universityName,
      country: null, qsRank: null,
    })),
    ...global.map((r) => ({
      id: r.id, name: r.name, dataset: "global" as const, type: null,
      state: null, district: null, website: null, institutionType: null,
      universityName: null, country: r.country, qsRank: r.qsRank,
    })),
  ];

  return {
    institutions,
    total: institutions.length,
    page: 1,
    totalPages: 1,
    verified: true,
    mappingBasis: "curated",
    source: mappings[0]?.source || "manual",
    disclaimer: "Verified education-institution mappings.",
  };
}

async function categoryDiscovery(
  degreeIds: string[],
  opts: InstitutionQueryOptions
): Promise<InstitutionResponse> {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(Math.max(1, opts.limit || DEFAULT_LIMIT), MAX_LIMIT);

  const degrees = await prisma.degree.findMany({
    where: { id: { in: degreeIds } },
    select: { name: true },
  });
  if (degrees.length === 0) {
    return emptyResponse(page, limit, "No verified or category-based institution mappings are available for this education pathway.");
  }

  const tokens = new Set<string>();
  degrees.forEach((d) => deriveInstitutionTypeTokens(d.name).forEach((t) => tokens.add(t)));
  if (tokens.size === 0) {
    return emptyResponse(
      page,
      limit,
      "The existing institution dataset has no category (institution type) that maps to this education pathway. No verified program data is available."
    );
  }

  const where: any = {
    AND: [
      { OR: [...tokens].map((t) => ({ institutionType: { contains: t, mode: "insensitive" } })) },
    ],
  };
  if (opts.state && opts.state !== "All") where.AND.push({ state: opts.state });
  if (opts.search) {
    where.AND.push({
      OR: [
        { name: { contains: opts.search, mode: "insensitive" } },
        { district: { contains: opts.search, mode: "insensitive" } },
      ],
    });
  }

  const [rows, total] = await Promise.all([
    prisma.indianInstitution.findMany({
      where,
      orderBy: [{ state: "asc" }, { name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, name: true, type: true, state: true, district: true,
        website: true, institutionType: true, universityName: true,
      },
    }),
    prisma.indianInstitution.count({ where }),
  ]);

  const institutions: InstitutionResult[] = rows.map((r) => ({
    id: r.id, name: r.name, dataset: "indian", type: r.type,
    state: r.state, district: r.district, website: r.website,
    institutionType: r.institutionType, universityName: r.universityName,
    country: null, qsRank: null,
  }));

  return {
    institutions,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    verified: false,
    mappingBasis: "institutionType-category",
    source: "aishe-category",
    disclaimer: CATEGORY_DISCLAIMER,
  };
}

export async function getInstitutionsForDegrees(
  degreeIds: string[],
  opts: InstitutionQueryOptions = {}
): Promise<InstitutionResponse> {
  if (!degreeIds.length) {
    return emptyResponse(opts.page || 1, opts.limit || DEFAULT_LIMIT, "No education pathway provided.");
  }
  const curated = await resolveCuratedMappings(degreeIds, []);
  if (curated) return curated;
  return categoryDiscovery(degreeIds, opts);
}

export async function getInstitutionsForSpecialization(
  specializationId: string,
  opts: InstitutionQueryOptions = {}
): Promise<InstitutionResponse> {
  const curated = await resolveCuratedMappings([], [specializationId]);
  if (curated) return curated;

  const spec = await prisma.specialization.findUnique({
    where: { id: specializationId },
    include: { degree: { select: { id: true, name: true } } },
  });
  if (!spec) {
    return emptyResponse(opts.page || 1, opts.limit || DEFAULT_LIMIT, "Specialization not found.");
  }
  return categoryDiscovery([spec.degree.id], opts);
}

export async function getInstitutionsForCareer(
  careerId: string,
  opts: InstitutionQueryOptions = {}
): Promise<InstitutionResponse> {
  const pathways = await prisma.careerEducationPathway.findMany({
    where: { careerId, type: "DEGREE_PATHWAY", degreeId: { not: null } },
    select: { degreeId: true, specializationId: true },
  });
  if (pathways.length === 0) {
    return emptyResponse(opts.page || 1, opts.limit || DEFAULT_LIMIT, "This career has no linked education pathways.");
  }

  const degreeIds = pathways.map((p) => p.degreeId!).filter(Boolean);
  const specializationIds = pathways.map((p) => p.specializationId!).filter(Boolean);

  const curated = await resolveCuratedMappings(degreeIds, specializationIds);
  if (curated) return curated;
  return categoryDiscovery(degreeIds, opts);
}
