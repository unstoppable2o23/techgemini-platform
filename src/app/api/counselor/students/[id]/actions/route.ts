import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { createAction, listActions, updateAction } from "@/lib/counselor/notes.ts";

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
  const actions = await listActions(auth.student.studentProfile!.id);
  return NextResponse.json({ actions });
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
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Action title is required" }, { status: 400 });
    }
    const action = await createAction({
      studentId: auth.student.studentProfile!.id,
      counselorId: session!.user.id,
      type: body.type,
      title: body.title.trim(),
      description: body.description ?? null,
      dueDate: body.dueDate ?? null,
    });
    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    console.error("Create action failed:", error);
    return NextResponse.json({ error: "Failed to create action" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const actionId = body.actionId;
  if (!actionId) {
    return NextResponse.json({ error: "actionId is required" }, { status: 400 });
  }
  try {
    const body = await request.json();
    const result = await updateAction(actionId, session.user.id, {
      completed: body.completed,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
    });
    return NextResponse.json({ updated: result });
  } catch (error) {
    console.error("Update action failed:", error);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}
