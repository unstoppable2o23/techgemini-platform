import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUniversityMatchesForStudent } from "@/lib/university-matching/engine.ts";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can view university matches" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const careerId = searchParams.get("careerId") || undefined;
  const degreeId = searchParams.get("degreeId") || undefined;
  const specializationId = searchParams.get("specializationId") || undefined;
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  // refresh is accepted for API parity; recommendations are recomputed live (no cache).
  searchParams.get("refresh");

  if (!careerId && !degreeId && !specializationId) {
    return NextResponse.json(
      { error: "Provide careerId, degreeId, or specializationId" },
      { status: 400 }
    );
  }

  try {
    const result = await getUniversityMatchesForStudent(session.user.id, {
      careerId,
      degreeId,
      specializationId,
      limit: isNaN(limit) ? 10 : limit,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("University matching failed:", error);
    return NextResponse.json({ error: "Failed to generate university matches" }, { status: 500 });
  }
}
