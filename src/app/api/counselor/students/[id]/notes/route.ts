import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { createNote, listNotes } from "@/lib/counselor/notes.ts";

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
  const notes = await listNotes(auth.student.studentProfile!.id);
  return NextResponse.json({ notes });
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
    if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json({ error: "Note content is required" }, { status: 400 });
    }
    const note = await createNote({
      studentId: auth.student.studentProfile!.id,
      counselorId: session!.user.id,
      type: body.type,
      content: body.content.trim(),
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Create note failed:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
