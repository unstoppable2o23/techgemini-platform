import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateStepStatus } from "@/lib/roadmap/service.ts";

/**
 * PATCH /api/student/roadmap/steps/[id]
 * Updates a roadmap step's status (complete/start/skip/etc) and optional note.
 * Student must own the roadmap; counselor must be authorized for the student.
 */
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let body: { status?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const status = body.status;
  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  try {
    const step = await prisma.roadmapStep.findUnique({ where: { id } });
    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }
    const roadmap = await prisma.studentRoadmap.findUnique({ where: { id: step.roadmapId } });
    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 });
    }
    const ownerId = roadmap.studentId;

    // Authorization: student must own the roadmap; counselor must be authorized (handled via 360 route below).
    if (session.user.role === "STUDENT" && ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await updateStepStatus(ownerId, id, status, { note: body.note });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Roadmap step update failed:", error);
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}
