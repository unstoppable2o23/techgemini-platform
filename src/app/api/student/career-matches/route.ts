import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCareerMatches, sanitizeCareerMatch } from "@/lib/career-matching/engine";
import { prisma } from "@/lib/prisma";
import type { CareerMatch } from "@/lib/career-matching/types";

/**
 * Presentation-layer enrichment: attaches the career's own education pathways
 * (primary/alternative degrees) to matched cards. This is display metadata from
 * the existing Career → Program intelligence — it does NOT affect scoring and
 * never invents programs or institutions.
 */
async function attachEducationPaths(matches: CareerMatch[]) {
  const ids = matches.map((m) => m.careerId).filter(Boolean);
  if (ids.length === 0) return;
  const rows = await prisma.careerEducationPathway.findMany({
    where: { careerId: { in: ids }, type: "DEGREE_PATHWAY" },
    select: {
      careerId: true,
      priority: true,
      degree: { select: { name: true, educationLevel: true } },
      specialization: { select: { name: true } },
    },
    orderBy: [{ careerId: "asc" }, { priority: "asc" }, { degree: { name: "asc" } }],
  });

  const byCareer = new Map<string, { primary: string[]; alternative: string[] }>();
  for (const r of rows) {
    if (!r.degree?.name) continue;
    const label = r.degree.educationLevel
      ? `${r.degree.name} · ${r.degree.educationLevel}`
      : r.degree.name;
    const bucket = r.priority === "ALTERNATIVE" ? "alternative" : "primary";
    const entry = byCareer.get(r.careerId) ?? { primary: [], alternative: [] };
    if (!entry[bucket].includes(label)) entry[bucket].push(label);
    byCareer.set(r.careerId, entry);
  }

  for (const m of matches) {
    const entry = byCareer.get(m.careerId);
    (m as any).educationPath = entry ?? { primary: [], alternative: [] };
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only students can view career matches" },
      { status: 403 }
    );
  }

  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const refresh = searchParams.get("refresh") === "true";

  try {
    const result = await getCareerMatches(user.id, {
      limit: isNaN(limit) ? 10 : limit,
      refresh,
    });

    const matches = result.matches.map(sanitizeCareerMatch);
    await attachEducationPaths(matches as CareerMatch[]);

    // Phase 26 — journey context per match: explored / shortlisted / preferred.
    const { assessCareerJourneyStates } = await import("@/lib/student/journey-state.ts");
    const journey = await assessCareerJourneyStates(
      user.id,
      matches.map((m) => m.careerId).filter(Boolean)
    );

    return NextResponse.json({
      matches,
      journey,
      totalCareersScored: result.totalCareersScored,
      studentSignalsUsed: result.studentSignalsUsed,
      assessmentCoverage: result.assessmentCoverage,
      hasAssessmentData: result.hasAssessmentData,
      disclaimer: result.disclaimer,
      lowInformation: result.lowInformation,
      topMatchStrength: result.topMatchStrength,
    });
  } catch (error) {
    console.error("Career matching failed:", error);
    return NextResponse.json(
      {
        matches: [],
        journey: {},
        totalCareersScored: 0,
        studentSignalsUsed: 0,
        assessmentCoverage: [],
        hasAssessmentData: false,
        disclaimer:
          "We couldn't generate your career matches right now. Please try again shortly.",
        lowInformation: false,
        topMatchStrength: "missing_evidence",
      },
      { status: 200 }
    );
  }
}
