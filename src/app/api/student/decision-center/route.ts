import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDecisionCenter } from "@/lib/decision-center/center";

/**
 * GET /api/student/decision-center
 * Returns the derived decision state for the signed-in student (Phase 29).
 * Read-only: the decision center never writes rows; saving/roadmap mutations
 * continue to use their existing APIs (shortlist, journey/career-path, roadmap).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = await getDecisionCenter(user.id);
  if (!state) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, state });
}