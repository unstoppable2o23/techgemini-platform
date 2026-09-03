import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOrCreateRoadmap,
  regenerateRoadmap,
} from "@/lib/roadmap/service.ts";

/**
 * Phases 21 — Student study roadmap.
 *
 * GET  : fetch (create-on-demand) the current student's OWN roadmap
 * POST : regenerate FUTURE steps (preserving completed + counselor steps)
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Students always access their OWN roadmap; the subject comes from the
  // signed-in session and is never read from the client.
  const studentId = session.user.id;

  try {
    const roadmap = await getOrCreateRoadmap(studentId);
    if (!roadmap) {
      return NextResponse.json({ error: "Unable to build roadmap" }, { status: 404 });
    }
    return NextResponse.json({ roadmap });
  } catch (error) {
    console.error("Roadmap fetch failed:", error);
    return NextResponse.json({ error: "Failed to load roadmap" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { destination?: string | null; careerId?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Students may only regenerate their own roadmap; changing career is a
  // counselor-triggered action through the 360 route.
  if (session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only students can regenerate their own roadmap here" },
      { status: 403 }
    );
  }

  // The subject always comes from the signed-in session, never the client.
  const studentId = session.user.id;

  try {
    const result = await regenerateRoadmap(studentId, {
      destinationOverride: body.destination,
      careerOverrideId: undefined, // students never change career via this route
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ roadmap: result.roadmap });
  } catch (error) {
    console.error("Roadmap regenerate failed:", error);
    return NextResponse.json({ error: "Failed to regenerate roadmap" }, { status: 500 });
  }
}
