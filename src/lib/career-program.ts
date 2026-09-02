import { prisma } from "@/lib/prisma";

export type CareerProgramRelationship =
  | "PRIMARY"
  | "COMMON"
  | "SPECIALIZED"
  | "RELEVANT"
  | "OPTIONAL";

// Deterministic rank order used for API output.
export const REL_RANK: Record<CareerProgramRelationship, number> = {
  PRIMARY: 0,
  COMMON: 1,
  SPECIALIZED: 2,
  RELEVANT: 3,
  OPTIONAL: 4,
};

export type CareerProgram = {
  programId: string;
  programName: string;
  programSlug: string;
  level: string;
  category: string;
  relationshipType: CareerProgramRelationship;
  strength: number;
  confidence: number;
  priority: number;
  rationale: string;
  source: string;
};

type MappingRow = {
  relationshipType: string;
  strength: number;
  confidence: number;
  priority: number;
  rationale: string;
  source: string;
  program: {
    id: string;
    name: string;
    slug: string;
    level: string;
    category: string;
  };
};

/**
 * Deterministically sorts career->program mappings.
 * Order: PRIMARY -> COMMON -> SPECIALIZED -> RELEVANT -> OPTIONAL, then by
 * ascending priority, then by program name for a stable tie-break.
 */
export function rankCareerPrograms(rows: MappingRow[]): CareerProgram[] {
  return rows
    .map((r) => {
      const rel = (REL_RANK[r.relationshipType as CareerProgramRelationship] !== undefined
        ? r.relationshipType
        : "RELEVANT") as CareerProgramRelationship;
      return {
        programId: r.program.id,
        programName: r.program.name ?? r.program.slug,
        programSlug: r.program.slug,
        level: r.program.level,
        category: r.program.category,
        relationshipType: rel,
        strength: r.strength ?? 0.5,
        confidence: r.confidence ?? 0.6,
        priority: r.priority ?? 100,
        rationale: r.rationale ?? "",
        source: r.source ?? "phase17-curated",
      };
    })
    .sort((a, b) => {
      const byRel = REL_RANK[a.relationshipType] - REL_RANK[b.relationshipType];
      if (byRel !== 0) return byRel;
      const byPriority = a.priority - b.priority;
      if (byPriority !== 0) return byPriority;
      return (a.programName ?? "").localeCompare(b.programName ?? "");
    });
}

/**
 * Recommend academic programs for a career by its id.
 * Returns null when the career does not exist or has no active mappings.
 */
export async function getCareerPrograms(
  careerId: string
): Promise<CareerProgram[] | null> {
  const career = await prisma.career.findUnique({
    where: { id: careerId },
    select: { id: true },
  });
  if (!career) return null;

  const rows = await prisma.careerProgramMapping.findMany({
    where: { careerId, isActive: true },
    include: {
      program: { select: { id: true, name: true, slug: true, level: true, category: true, isActive: true } },
    },
    orderBy: [{ relationshipType: "asc" }, { priority: "asc" }],
  });

  const activeRows = (rows as unknown as Array<MappingRow & { program: { isActive: boolean } }>).filter(
    (r) => r.program.isActive
  );

  return rankCareerPrograms(activeRows as unknown as MappingRow[]);
}