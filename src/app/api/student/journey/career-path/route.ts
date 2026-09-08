import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setStudentPathway } from "@/lib/student/pathway";

/**
 * POST /api/student/journey/career-path
 * Body: { careerId }
 * Confirms a career as the student's pathway: sets preferredCareer (existing
 * StudentProfile field), records `pathway_started`, regenerates the roadmap.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { careerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const careerId = typeof body?.careerId === "string" ? body.careerId.trim() : "";
  if (!careerId) {
    return NextResponse.json({ error: "careerId is required" }, { status: 400 });
  }

  const result = await setStudentPathway(session.user.id, careerId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    preferredCareerId: result.preferredCareerId,
    preferredCareerName: result.preferredCareerName,
    roadmap: result.roadmap ?? null,
  });
}