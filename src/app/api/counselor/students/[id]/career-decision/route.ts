import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { listCareerDecisions, upsertCareerDecision } from "@/lib/counselor/planning.ts";

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
  const decisions = await listCareerDecisions(auth.student.studentProfile!.id);
  return NextResponse.json({ decisions });
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
    const decision = await upsertCareerDecision({
      studentProfileId: auth.student.studentProfile!.id,
      createdById: session!.user.id,
      careerId: body.careerId,
      discussed: typeof body.discussed === "boolean" ? body.discussed : undefined,
      studentInterest:
        typeof body.studentInterest === "boolean" ? body.studentInterest : undefined,
      shortlistedCareer:
        typeof body.shortlistedCareer === "boolean" ? body.shortlistedCareer : undefined,
      selectedPathway:
        typeof body.selectedPathway === "boolean" ? body.selectedPathway : undefined,
      counselorRecommendation:
        typeof body.counselorRecommendation === "string"
          ? body.counselorRecommendation.trim() || null
          : undefined,
      followUpRequired:
        typeof body.followUpRequired === "boolean" ? body.followUpRequired : undefined,
      note: typeof body.note === "string" ? body.note.trim() || null : undefined,
    });
    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    console.error("Career decision upsert failed:", error);
    return NextResponse.json({ error: "Failed to save career decision" }, { status: 500 });
  }
}