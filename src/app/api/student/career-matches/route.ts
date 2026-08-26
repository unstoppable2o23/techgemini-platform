import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCareerMatches } from "@/lib/career-matching/engine";

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

    return NextResponse.json({
      matches: result.matches,
      totalCareersScored: result.totalCareersScored,
      studentSignalsUsed: result.studentSignalsUsed,
      assessmentCoverage: result.assessmentCoverage,
      hasAssessmentData: result.hasAssessmentData,
      disclaimer: result.disclaimer,
    });
  } catch (error) {
    console.error("Career matching failed:", error);
    return NextResponse.json(
      { error: "Failed to generate career matches" },
      { status: 500 }
    );
  }
}
