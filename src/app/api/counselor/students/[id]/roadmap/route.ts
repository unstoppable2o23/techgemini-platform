import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import {
  getOrCreateRoadmap,
  regenerateRoadmap,
  addCounselorStep,
  updateStepStatus,
} from "@/lib/roadmap/service.ts";

/**
 * Phase 21 — Counselor roadmap within Student 360.
 *
 * GET  : fetch the authorized student's roadmap
 * POST : regenerate future steps (optionally changing destination/career)
 *        or add a counselor-authored step (origin COUNSELOR)
 * PATCH: update a step's status on the authorized student's roadmap
 */
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
  try {
    const roadmap = await getOrCreateRoadmap(id);
    if (!roadmap) {
      return NextResponse.json({ error: "Unable to build roadmap" }, { status: 404 });
    }
    return NextResponse.json({ roadmap });
  } catch (error) {
    console.error("Counselor roadmap fetch failed:", error);
    return NextResponse.json({ error: "Failed to load roadmap" }, { status: 500 });
  }
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

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    if (body.action === "add-step") {
      const result = await addCounselorStep(id, {
        title: body.title,
        description: body.description,
        category: body.category ?? "OTHER",
        priority: body.priority ?? "MEDIUM",
        timeHorizon: body.timeHorizon ?? "NOW",
        reason: body.reason,
        dependency: body.dependency,
        sourceLabel: body.sourceLabel,
        pathType: body.pathType,
        educationLevel: body.educationLevel,
        counselorNote: body.note,
        dueHint: body.dueHint,
      });
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      const roadmap = await getOrCreateRoadmap(id);
      return NextResponse.json({ roadmap });
    }

    // Regenerate future steps (optionally changing destination / career goal).
    const result = await regenerateRoadmap(id, {
      destinationOverride: body.destination ?? null,
      careerOverrideId: body.careerId ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Counselor roadmap write failed:", error);
    return NextResponse.json({ error: "Failed to update roadmap" }, { status: 500 });
  }
}

export async function PATCH(
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

  let body: { stepId?: string; status?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body.stepId || !body.status) {
    return NextResponse.json({ error: "stepId and status are required" }, { status: 400 });
  }
  try {
    const result = await updateStepStatus(id, body.stepId, body.status, { note: body.note });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Counselor roadmap step update failed:", error);
    return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
  }
}
