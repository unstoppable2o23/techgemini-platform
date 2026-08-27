import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { createFeedback, listFeedback } from "@/lib/counselor/notes.ts";

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
  const feedback = await listFeedback(auth.student.studentProfile!.id);
  return NextResponse.json({ feedback });
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
    const recommendationType = body.recommendationType;
    if (recommendationType !== "CAREER" && recommendationType !== "UNIVERSITY") {
      return NextResponse.json(
        { error: "recommendationType must be CAREER or UNIVERSITY" },
        { status: 400 }
      );
    }
    if (!body.decision || typeof body.decision !== "string") {
      return NextResponse.json({ error: "decision is required" }, { status: 400 });
    }
    if (recommendationType === "CAREER" && !body.careerId) {
      return NextResponse.json(
        { error: "careerId is required for CAREER feedback" },
        { status: 400 }
      );
    }
    if (recommendationType === "UNIVERSITY" && !body.institutionId) {
      return NextResponse.json(
        { error: "institutionId is required for UNIVERSITY feedback" },
        { status: 400 }
      );
    }

    const feedback = await createFeedback({
      studentId: auth.student.studentProfile!.id,
      counselorId: session!.user.id,
      recommendationType,
      careerId: recommendationType === "CAREER" ? body.careerId : null,
      institutionId: recommendationType === "UNIVERSITY" ? body.institutionId : null,
      institutionType: body.institutionType ?? null,
      decision: body.decision,
      note: body.note ?? null,
    });
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error("Create recommendation feedback failed:", error);
    return NextResponse.json(
      { error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
