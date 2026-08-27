import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUniversityMatchForInstitution } from "@/lib/university-matching/engine.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can view university matches" }, { status: 403 });
  }

  const { institutionId } = await params;
  const { searchParams } = request.nextUrl;
  const careerId = searchParams.get("careerId") || undefined;
  const degreeId = searchParams.get("degreeId") || undefined;
  const specializationId = searchParams.get("specializationId") || undefined;
  const dataset = searchParams.get("dataset") === "global" ? "global" : "indian";

  try {
    const detail = await getUniversityMatchForInstitution(session.user.id, institutionId, {
      careerId,
      degreeId,
      specializationId,
      dataset,
    });
    if (!detail) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }
    return NextResponse.json({
      match: detail.result,
      careerContext: detail.careerContext,
      educationContext: detail.educationContext,
      disclaimer: detail.disclaimer,
    });
  } catch (error) {
    console.error("University match detail failed:", error);
    return NextResponse.json({ error: "Failed to generate university match detail" }, { status: 500 });
  }
}
