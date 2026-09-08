import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCareerMatches, sanitizeCareerMatch } from "@/lib/career-matching/engine";
import { prisma } from "@/lib/prisma";
import { getCareerPrograms } from "@/lib/career-program";
import type { CareerMatch } from "@/lib/career-matching/types";

/**
 * Compare up to 3 career recommendations. Composes the engine's own match
 * output with the careers' existing program / skills / work-environment data.
 * Nothing here re-scores or fabricates evidence.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const careerIds = (request.nextUrl.searchParams.getAll("careerId") || []).filter(Boolean);
  if (careerIds.length === 0 || careerIds.length > 3) {
    return NextResponse.json({ error: "Select between 1 and 3 careers to compare" }, { status: 400 });
  }

  try {
    // Sorted full ranking from the engine (frozen scoring).
    const result = await getCareerMatches(session.user.id, { limit: 200 });
    const byId = new Map(result.matches.map((m) => [m.careerId, sanitizeCareerMatch(m)]));
    const matches = careerIds
      .map((id) => byId.get(id))
      .filter((m): m is ReturnType<typeof sanitizeCareerMatch> => Boolean(m));

    if (matches.length === 0) {
      return NextResponse.json({ error: "No matching career data found" }, { status: 404 });
    }

    // ---- enrichment (presentation only) ----
    const careers = await prisma.career.findMany({
      where: { id: { in: matches.map((m) => m.careerId) } },
      select: {
        id: true,
        workEnvironment: true,
        workActivities: true,
        technicalSkills: true,
        softSkills: true,
        recommendedDegrees: true,
        minStudyLevel: true,
      },
    });
    const careerById = new Map(careers.map((c) => [c.id, c]));

    const pathways = await prisma.careerEducationPathway.findMany({
      where: { careerId: { in: matches.map((m) => m.careerId) }, type: "DEGREE_PATHWAY" },
      select: { careerId: true, priority: true, degree: { select: { name: true } } },
      orderBy: [{ careerId: "asc" }, { priority: "asc" }],
    });
    const pathByCareer = new Map<string, string[]>();
    for (const p of pathways) {
      if (!p.degree?.name) continue;
      const list = pathByCareer.get(p.careerId) ?? [];
      if (!list.includes(p.degree.name)) list.push(p.degree.name);
      pathByCareer.set(p.careerId, list);
    }

    const programsByCareer = new Map<string, string[]>();
    for (const id of matches.map((m) => m.careerId)) {
      try {
        const progs = await getCareerPrograms(id);
        programsByCareer.set(id, (progs ?? []).slice(0, 5).map((p) => p.programName));
      } catch {
        programsByCareer.set(id, []);
      }
    }

    const compare = matches.map((m) => {
      const e = careerById.get(m.careerId);
      const sanitized = m as CareerMatch;
      return {
        match: sanitized,
        workEnvironment: e?.workEnvironment ?? null,
        workActivities: e?.workActivities ?? [],
        skills: [...(e?.technicalSkills ?? []), ...(e?.softSkills ?? [])],
        careerOptions: e?.recommendedDegrees ?? [],
        minStudyLevel: e?.minStudyLevel ?? null,
        educationPath: pathByCareer.get(m.careerId) ?? [],
        programs: programsByCareer.get(m.careerId) ?? [],
      };
    });

    return NextResponse.json({ careers: compare, totalCareersScored: result.totalCareersScored });
  } catch (error) {
    console.error("Career comparison failed:", error);
    return NextResponse.json({ error: "Failed to load comparison" }, { status: 500 });
  }
}