import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUniversityMatchesForStudent } from "@/lib/university-matching/engine.ts";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const auth = await loadAuthorizedStudent(id, session);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 404 ? "Student not found" : "Forbidden" },
      { status: auth.status }
    );
  }

  const { searchParams } = request.nextUrl;
  const careerId = searchParams.get("careerId") || undefined;
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  try {
    const result = await getUniversityMatchesForStudent(id, {
      careerId,
      limit: isNaN(limit) ? 8 : Math.min(Math.max(limit, 1), 50),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Counselor university matches failed:", error);
    return NextResponse.json(
      { error: "Failed to load university matches" },
      { status: 500 }
    );
  }
}
