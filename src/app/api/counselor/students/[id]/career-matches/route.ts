import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCareerMatches } from "@/lib/career-matching/engine.ts";
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
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  try {
    const result = await getCareerMatches(id, {
      limit: isNaN(limit) ? 10 : Math.min(Math.max(limit, 1), 50),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Counselor career matches failed:", error);
    return NextResponse.json(
      { error: "Failed to load career matches" },
      { status: 500 }
    );
  }
}
