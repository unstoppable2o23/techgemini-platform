import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCareerPrograms } from "@/lib/career-program";
import { getShortlistProgramIds } from "@/lib/program-intelligence/search-session.ts";
import {
  normalizeQualification,
  disciplineOf,
  educationStageFitOf,
  nextStepOf,
} from "@/lib/program-intelligence/normalize.ts";
import { getAdmissionInfo } from "@/lib/program-intelligence/admissions.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  try {
    const resolvedParams = await params;
    const careerId = resolvedParams.careerId;

    const career = await prisma.career.findUnique({
      where: { id: careerId },
      select: { id: true, name: true, slug: true, category: true },
    });

    if (!career) {
      return NextResponse.json(
        { error: "Career not found" },
        { status: 404 }
      );
    }

    const programs = await getCareerPrograms(careerId);
    const programIds = (programs ?? []).map((p) => p.programId);

    const [careerCounts, shortlistProgramIds] = await Promise.all([
      programIds.length > 0
        ? prisma.careerProgramMapping.groupBy({
            by: ["programId"],
            where: { programId: { in: programIds }, isActive: true },
          })
        : Promise.resolve([]),
      getShortlistProgramIds(request),
    ]);

    const countById = new Map(
      (careerCounts as Array<{ programId: string; _count: { _all: number } }>).map((c) => [
        c.programId,
        c._count._all,
      ])
    );

    const enriched = (programs ?? []).map((p) => {
      const admission = getAdmissionInfo({ programName: p.programName, level: p.level, category: p.category });
      const stageFit = educationStageFitOf(p.level);
      return {
        ...p,
        sharedWithCareers: countById.get(p.programId) ?? 0,
        saved: shortlistProgramIds.has(p.programId),
        normalized: {
          qualification: normalizeQualification(p.level),
          discipline: disciplineOf(p.category),
          educationStageFit: stageFit,
          nextStep: stageFit.length
            ? `Next stage: ${stageFit[stageFit.length - 1].split(" — ")[0]}. ${nextStepOf(p.level, admission)}`
            : nextStepOf(p.level, admission),
          admission,
        },
      };
    });

    return NextResponse.json({
      career: {
        id: career.id,
        name: career.name,
        slug: career.slug,
        category: career.category,
      },
      programs: enriched,
      mapped: enriched.length > 0,
    });
  } catch (error) {
    console.error("Error fetching career programs:", error);
    return NextResponse.json(
      { error: "Failed to fetch career programs" },
      { status: 500 }
    );
  }
}