import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { comparePrograms, MAX_PROGRAM_COMPARE } from "@/lib/program-intelligence/compare.ts";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (!user.id || (user.role !== "STUDENT" && user.role !== "COUNSELOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const ids = Array.isArray(body.programIds) ? body.programIds : [];
    const stringIds = ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
    if (stringIds.length < 2) {
      return NextResponse.json(
        { error: "Select at least two programs to compare" },
        { status: 400 }
      );
    }
    if (stringIds.length > MAX_PROGRAM_COMPARE) {
      return NextResponse.json(
        { error: `Compare up to ${MAX_PROGRAM_COMPARE} programs at a time` },
        { status: 400 }
      );
    }
    const comparison = await comparePrograms(stringIds);
    if (comparison.programs.length < 2) {
      return NextResponse.json(
        { error: "One or more programs were not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(comparison);
  } catch (error) {
    console.error("Program compare failed:", error);
    return NextResponse.json({ error: "Failed to compare programs" }, { status: 500 });
  }
}