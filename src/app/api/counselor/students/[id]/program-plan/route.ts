import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { listProgramPlans, upsertProgramPlan } from "@/lib/counselor/planning.ts";

export async function GET(
  _request: NextRequest,
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
  const plans = await listProgramPlans(auth.student.studentProfile!.id);
  return NextResponse.json({ plans });
}

export async function POST(
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

  try {
    const body = await request.json();
    if (!body.careerId || typeof body.careerId !== "string") {
      return NextResponse.json({ error: "careerId is required" }, { status: 400 });
    }
    if (!body.programId || typeof body.programId !== "string") {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }
    const plan = await upsertProgramPlan({
      studentProfileId: auth.student.studentProfile!.id,
      createdById: session!.user.id,
      careerId: body.careerId,
      programId: body.programId,
      discussed: typeof body.discussed === "boolean" ? body.discussed : undefined,
      shortlisted: typeof body.shortlisted === "boolean" ? body.shortlisted : undefined,
      requiresResearch:
        typeof body.requiresResearch === "boolean" ? body.requiresResearch : undefined,
      studentInterested:
        typeof body.studentInterested === "boolean" ? body.studentInterested : undefined,
      note: typeof body.note === "string" ? body.note.trim() || null : undefined,
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("Program plan upsert failed:", error);
    return NextResponse.json({ error: "Failed to save program plan" }, { status: 500 });
  }
}