import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setGoalProgram, clearGoalProgram } from "@/lib/roadmap/service.ts";

/**
 * Phase 28 — record the student's recognized goal program on their roadmap.
 * Additive: only sets goalProgramId/goalProgramName; never rewrites steps.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const studentId = session.user.id;

  let programId: string | null = null;
  try {
    const body = await request.json();
    programId = typeof body.programId === "string" ? body.programId : null;
  } catch {
    programId = null;
  }

  if (!programId) {
    return NextResponse.json({ error: "programId is required" }, { status: 400 });
  }

  try {
    const result = await setGoalProgram(studentId, programId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Set goal program failed:", error);
    return NextResponse.json({ error: "Failed to record goal program" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await clearGoalProgram(session.user.id);
    return NextResponse.json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Clear goal program failed:", error);
    return NextResponse.json({ error: "Failed to clear goal program" }, { status: 500 });
  }
}