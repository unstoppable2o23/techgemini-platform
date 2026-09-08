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
  /** True when the institution carries the Diploma / Polytechnic category. */
  diplomaPolytechnic?: boolean;
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
 *
 * Phase 23.1 correction (§ diploma/degree separation): a "diploma" degree name
 * must NOT also yield the degree-granting `Technical` category. The Technical
 * rule therefore carries `excludeIf: ["diploma"]` so a Diploma in Mechanical /
 * Computer / Civil Engineering maps to the Diploma / Polytechnic category ONLY —
 * the two tracks are kept separate ("Polytechnic / Diploma" vs "B.E./B.Tech").
 */
interface FieldRule {
  tokens: string[];
  types: string[];
  /** When ANY of these tokens appear in the degree text, this rule is skipped. */
  excludeIf?: string[];
}

const FIELD_RULES: FieldRule[] = [
  {
    tokens: ["diploma"],
    types: ["Polytechnic"],
  },
  {
    tokens: ["engineering", "tech", "b.tech", "m.tech", "be ", "b.e.", "civil", "mechanical", "electrical", "electronics", "computer"],
    types: ["Technical"],
    excludeIf: ["diploma"],
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
    if (rule.excludeIf?.some((t) => text.includes(t))) continue;
    if (rule.tokens.some((t) => text.includes(t))) {
      rule.types.forEach((ty) => matched.add(ty));
    }
  }
  return [...matched];
}

/**
 * True when the AISHE `institutionType` string marks the institution as a
 * diploma-level institution (polytechnics plus the "(Diploma)" institutes
 * such as Nursing / Teacher Training / Ayurvedic Nursing). These institutions
 * are legitimate for DIPLOMA pathways but must NOT be presented as degree
 * institutions for B.E./B.Tech (or other degree-only) pathways without a
 * verified degree program.
 *
 * Phase 23.2 (Part A — polytechnic hardening): the AISHE dataset stores ALL
 * polytechnics under the shared type "Technical/Polytechnic" and the degree
 * token "Technical" therefore matches only diploma-level rows. Degree-only
 * category queries exclude diploma-level institutions so a B.E./B.Tech query
 * never surfaces a Polytechnic row; degree candidates must come from the
 * verified-program / curated tiers instead.
 */
export function isDiplomaLevelInstitutionType(institutionType?: string | null): boolean {
  const t = (institutionType || "").toLowerCase();
  return t.includes("polytechnic") || t.includes("(diploma)");
}

/**
 * Human label for the AISHE diploma-level institution types.
 * The dataset stores degree-serving technical colleges and diploma-serving
 * polytechnics under the shared type string "Technical/Polytechnic"; "(Diploma)"
 * institutes (Nursing / Teacher Training / Ayurvedic Nursing) are similarly
 * diploma-level. For UI clarity we surface the Diploma angle as a separate label
 * so these institutes are never mistaken for a degree institution.
 */
export function institutionQualificationLabel(
  institutionType?: string | null
): string | null {
  const t = (institutionType || "").toLowerCase();
  if (!t.includes("polytechnic") && !t.includes("(diploma)")) return null;
  if (t.includes("polytechnic")) return "Diploma / Polytechnic";
  return "Diploma";
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
  "These institutions are related by category (institution type derived from the education pathway). A Diploma / Polytechnic pathway maps to polytechnic and other diploma-level institutions; a B.E./B.Tech (or other degree-only) pathway maps ONLY to institutions verified or curated to grant that degree — diploma-level institutions are excluded because AISHE category data cannot certify degree offerings. Individual course/program offerings are NOT individually verified. Source: AISHE institution data.";

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
      diplomaPolytechnic: institutionQualificationLabel(r.institutionType) !== null,
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

  // Phase 23.2 (Part A — polytechnic hardening). When EVERY degree in the query
  // is a degree (none is a Diploma), diploma-level institutions (polytechnics,
  // "(Diploma)" institutes) must not be returned as category matches: the AISHE
  // category cannot certify degree offerings at a diploma institution. Degree
  // candidates then come from the verified-program / curated tiers only. Queries
  // that include a Diploma degree (or Diploma-only careers) keep the diploma
  // institutions, which is where they legitimately belong.
  const degreeOnlyContext = !degrees.some((d) => /diploma/i.test(d.name || ""));

  const where: any = {
    AND: [
      { OR: [...tokens].map((t) => ({ institutionType: { contains: t, mode: "insensitive" } })) },
    ],
  };
  if (degreeOnlyContext) {
    where.AND.push({
      NOT: {
        OR: [
          { institutionType: { contains: "Polytechnic", mode: "insensitive" } },
          { institutionType: { contains: "(Diploma)", mode: "insensitive" } },
        ],
      },
    });
  }
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
    diplomaPolytechnic: institutionQualificationLabel(r.institutionType) !== null,
  }));

  const CATEGORY_EMPTY_DISCLAIMER =
    "No institution matched this education pathway in the AISHE institution dataset. For degree-only pathways the diploma-level institutions (polytechnics, \"(Diploma)\" institutes) are excluded because AISHE category data cannot certify degree offerings; try the verified-program or curated tiers for evidence-based degree institutions.";

  return {
    institutions,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    verified: false,
    mappingBasis: total > 0 ? "institutionType-category" : "none",
    source: "aishe-category",
    disclaimer: total > 0 ? CATEGORY_DISCLAIMER : CATEGORY_EMPTY_DISCLAIMER,
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
