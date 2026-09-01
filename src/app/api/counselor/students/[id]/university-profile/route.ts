import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getUniversityProfile } from "@/lib/university-profile/profile.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;
  const session = await getServerSession(authOptions);
  const auth = await loadAuthorizedStudent(studentId, session);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.status === 404 ? "Student not found" : "Forbidden" }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const institutionId = searchParams.get("institutionId");
  const dataset = searchParams.get("dataset") === "global" ? "global" : "indian";
  const careerId = searchParams.get("careerId") || undefined;
  const degreeId = searchParams.get("degreeId") || undefined;
  const specializationId = searchParams.get("specializationId") || undefined;

  if (!institutionId) {
    return NextResponse.json({ error: "Provide institutionId" }, { status: 400 });
  }

  const { getUniversityProfile } = await import("@/lib/university-profile/profile.ts");
  try {
    const profile = await getUniversityProfile(institutionId, dataset, { studentId, careerId, degreeId, specializationId });
    if (!profile) {
      return NextResponse.json({ error: "Institution not found" }, { status: 404 });
    }
    // Reuse same profile structure — no separate counselor logic, just extended API
    return NextResponse.json({
      ...profile,
      // Counselor sees same, but we ensure studentContext is populated
      _counselor: {
        studentId,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Counselor university profile failed:", error);
    return NextResponse.json({ error: "Failed to load university profile" }, { status: 500 });
  }
}
