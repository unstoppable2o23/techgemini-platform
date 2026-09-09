/**
 * Phase 28 — structured program search + data-driven institution facets.
 *
 * Two correlated but deliberately separate catalogs:
 *  - `items`      -> AcademicProgram catalog (career relevance, qualification,
 *                    discipline). Searchable by name/category/qualification.
 *  - `institutionOffers` -> institution-offered Program rows (availability,
 *                    country/state/institution type). Only surfaces when the
 *                    underlying data exists. Facets are data-driven: a facet
 *                    with zero rows is omitted, never shown as 0.
 */
import { prisma } from "@/lib/prisma";
import type { InstitutionKind } from "./types.ts";
import type {
  ProgramSearchItem,
  ProgramSearchResult,
  ProgramInstitutionOffer,
  QualificationKind,
} from "./types.ts";
import {
  normalizeQualification,
  disciplineOf,
  educationStageFitOf,
  nextStepOf,
} from "./normalize.ts";
import { getAdmissionInfo } from "./admissions.ts";
import { computeFreshness } from "../university-profile/freshness.ts";

const QUALIFICATION_TO_LEVELS: Partial<Record<QualificationKind, string[]>> = {
  DIPLOMA: ["Diploma"],
  CERTIFICATE: ["Certificate"],
  BACHELORS: ["Bachelor's"],
  PROFESSIONAL_DEGREE: ["Professional Degree"],
  MASTERS: ["Master's"],
};

export type ProgramSearchParams = {
  q?: string | null;
  qualification?: QualificationKind | null;
  discipline?: string | null;
  institutionCountry?: string | null;
  institutionState?: string | null;
  institutionType?: string | null;
  institutionKind?: InstitutionKind | null;
  limit?: number;
  shortlistProgramIds?: string[] | null;
};

type MappingCountRow = { programId: string; _count: { _all: number } };

export async function searchPrograms(
  params: ProgramSearchParams
): Promise<ProgramSearchResult> {
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 50);
  const q = (params.q ?? "").trim();

  const nameFilter: Record<string, unknown>[] = [];
  if (q) {
    nameFilter.push({ name: { contains: q, mode: "insensitive" } });
    nameFilter.push({ slug: { contains: q, mode: "insensitive" } });
    nameFilter.push({ category: { contains: q, mode: "insensitive" } });
  }
  const levels = params.qualification ? QUALIFICATION_TO_LEVELS[params.qualification] : null;

  const where: Record<string, unknown> = { isActive: true };
  if (nameFilter.length > 0) where.OR = nameFilter;
  if (params.discipline) {
    const cat = params.discipline.replace(/-/g, " ");
    where.category = { contains: cat, mode: "insensitive" };
  }
  if (levels) where.level = { in: levels };

  const programs = await prisma.academicProgram.findMany({
    where: where as never,
    select: {
      id: true,
      name: true,
      slug: true,
      level: true,
      category: true,
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  const programIds = programs.map((p) => p.id);

  const [careerCounts, careerRows] = await Promise.all([
    programIds.length > 0
      ? prisma.careerProgramMapping.groupBy({
          by: ["programId"],
          where: { programId: { in: programIds }, isActive: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    programIds.length > 0
      ? prisma.careerProgramMapping.findMany({
          where: { programId: { in: programIds }, isActive: true },
          select: {
            programId: true,
            relationshipType: true,
            career: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const countById = new Map<string, number>(
    (careerCounts as MappingCountRow[]).map((c) => [c.programId, c._count._all])
  );
  const careersById = new Map<string, { id: string; name: string; relationshipType: string }[]>();
  for (const row of careerRows as any[]) {
    const list = careersById.get(row.programId) ?? [];
    list.push({ id: row.career.id, name: row.career.name, relationshipType: row.relationshipType });
    careersById.set(row.programId, list);
  }

  const savedSet = new Set(params.shortlistProgramIds ?? []);

  const items: ProgramSearchItem[] = programs.map((p) => {
    const card = programCardFromAcademicProgram(p, countById.get(p.id) ?? 0, careersById.get(p.id) ?? []);
    return {
      ...card,
      careers: careersById.get(p.id) ?? [],
      availability: {
        institutionCount: 0,
        institutionCountries: [],
        institutionStates: [],
      },
      saved: savedSet.has(p.id),
    };
  });

  const facets = await buildFacets(q, params.qualification, params.discipline);

  const institutionOffers = await buildInstitutionOffers(params, q);

  return {
    items,
    total: programs.length,
    limit,
    facets,
    institutionOffers: institutionOffers.offers,
    institutionOfferTotal: institutionOffers.total,
    clarifier:
      "Search covers the curated program catalog. Institution-level offers come from the separately verified institution catalog; a program can exist in one without the other.",
  };
}

export function programCardFromAcademicProgram(
  p: { id: string; name: string; slug: string; level: string; category: string },
  sharedWithCareers: number,
  careers: { id: string; name: string; relationshipType: string }[]
) {
  const qualification = normalizeQualification(p.level);
  const discipline = disciplineOf(p.category);
  const admission = getAdmissionInfo({ programName: p.name, level: p.level, category: p.category });
  const stageFit = educationStageFitOf(p.level);
  const stageAbove = stageFit[stageFit.length - 1] ?? "";
  return {
    programId: p.id,
    programName: p.name,
    slug: p.slug,
    level: p.level,
    category: p.category,
    qualification,
    discipline,
    relationshipType: "PRIMARY",
    rationale: `${p.name} is a ${qualification?.name ?? p.level} program in the ${discipline.name} discipline tracked in the curated catalog.`,
    source: "phase17-curated",
    sharedWithCareers,
    admission,
    educationStageFit: stageFit,
    nextStep: stageAbove
      ? `Next stage: ${stageAbove}. ${nextStepOf(p.level, admission)}`
      : nextStepOf(p.level, admission),
  } as ProgramSearchItem;
}

async function buildFacets(
  q: string,
  qualification: QualificationKind | null | undefined,
  discipline: string | null | undefined
): Promise<ProgramSearchResult["facets"]> {
  const nameFilter: Record<string, unknown>[] = [];
  if (q) {
    nameFilter.push({ name: { contains: q, mode: "insensitive" } });
    nameFilter.push({ slug: { contains: q, mode: "insensitive" } });
    nameFilter.push({ category: { contains: q, mode: "insensitive" } });
  }
  const where: Record<string, unknown> = { isActive: true };
  if (nameFilter.length > 0) where.OR = nameFilter;
  if (discipline) where.category = { contains: discipline.replace(/-/g, " "), mode: "insensitive" };
  if (qualification) where.level = { in: QUALIFICATION_TO_LEVELS[qualification] ?? [] };

  const levelGroups = await prisma.academicProgram.groupBy({
    by: ["level", "category"],
    where: where as never,
  });
  const levelCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  for (const g of levelGroups as Array<{ level: string | null; category: string | null }>) {
    if (g.level) levelCounts.set(g.level, (levelCounts.get(g.level) ?? 0) + 1);
    if (g.category) categoryCounts.set(g.category, (categoryCounts.get(g.category) ?? 0) + 1);
  }

  const countries = await prisma.program.groupBy({
    by: ["universityId"],
  });
  const countryRows = countries.length > 0
    ? await prisma.university.findMany({ where: { id: { in: countries.map((c) => c.universityId).filter(Boolean) as string[] } }, select: { id: true, country: true } })
    : [];
  const countryCounts = new Map<string, number>();
  for (const u of countryRows) {
    if (u.country) countryCounts.set(u.country, (countryCounts.get(u.country) ?? 0) + 1);
  }

  const states = await prisma.program.groupBy({
    by: ["indianInstitutionId"],
  });
  const stateRows = states.length > 0
    ? await prisma.indianInstitution.findMany({ where: { id: { in: states.map((s) => s.indianInstitutionId).filter(Boolean) as string[] } }, select: { id: true, state: true } })
    : [];
  const stateCounts = new Map<string, number>();
  for (const s of stateRows) {
    if (s.state) stateCounts.set(s.state, (stateCounts.get(s.state) ?? 0) + 1);
  }

  const types = await prisma.program.groupBy({
    by: ["indianInstitutionId"],
  });
  const typeRows = types.length > 0
    ? await prisma.indianInstitution.findMany({ where: { id: { in: types.map((t) => t.indianInstitutionId).filter(Boolean) as string[] } }, select: { id: true, institutionType: true } })
    : [];
  const typeCounts = new Map<string, number>();
  for (const t of typeRows) {
    if (t.institutionType) typeCounts.set(t.institutionType, (typeCounts.get(t.institutionType) ?? 0) + 1);
  }

  return {
    qualification: Array.from(levelCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    disciplines: Array.from(categoryCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    countries: fromMap(countryCounts),
    states: fromMap(stateCounts),
    institutionTypes: fromMap(typeCounts),
  };
}

function fromMap(map: Map<string, number>): { value: string; count: number }[] {
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

async function buildInstitutionOffers(
  params: ProgramSearchParams,
  q: string
): Promise<{ offers: ProgramInstitutionOffer[]; total: number }> {
  const and: Record<string, unknown>[] = [];
  if (q) {
    and.push({ name: { contains: q, mode: "insensitive" } });
  }
  if (params.institutionKind) {
    if (params.institutionKind === "INDIAN") and.push({ indianInstitutionId: { not: null } });
    else and.push({ universityId: { not: null } });
  }
  if (params.institutionCountry) {
    and.push({
      university: { is: { country: { contains: params.institutionCountry, mode: "insensitive" } } },
    });
  }
  if (params.institutionState) {
    and.push({
      indianInstitution: { is: { state: { contains: params.institutionState, mode: "insensitive" } } },
    });
  }
  if (params.institutionType) {
    and.push({
      indianInstitution: { is: { institutionType: { contains: params.institutionType, mode: "insensitive" } } },
    });
  }

  const [total, rows] = await Promise.all([
    prisma.program.count({ where: and.length > 0 ? { AND: and } : {} as never }),
    prisma.program.findMany({
      where: and.length > 0 ? { AND: and } : {} as never,
      take: 8,
      orderBy: { name: "asc" },
      include: {
        degree: { select: { name: true } },
        indianInstitution: { select: { id: true, name: true, state: true, institutionType: true } },
        university: { select: { id: true, name: true, country: true } },
      },
    }),
  ]);

  const offers: ProgramInstitutionOffer[] = (rows as any[]).map((r) => {
    const inst = r.indianInstitution ?? r.university;
    const kind: InstitutionKind = r.indianInstitution ? "INDIAN" : "INTERNATIONAL";
    const location =
      kind === "INDIAN"
        ? [r.indianInstitution?.state, r.indianInstitution?.district].filter(Boolean).join(", ")
        : r.university?.country ?? null;
    return {
      programId: r.id,
      programName: r.name ?? "Untitled program",
      level: r.level,
      qualification: normalizeQualification(r.level),
      institution: {
        id: inst.id,
        name: inst.name,
        kind,
        location,
        institutionType: r.indianInstitution?.institutionType ?? null,
      },
      provenance: {
        source: r.source ?? "official-website",
        sourceUrl: r.sourceUrl,
        verificationStatus: r.verificationStatus ?? "UNVERIFIED",
        verifiedAt: r.verifiedAt ? new Date(r.verifiedAt).toISOString() : null,
      },
      freshness: computeFreshness(r.verifiedAt as Date | null ?? null),
    };
  });
  return { offers, total };
}