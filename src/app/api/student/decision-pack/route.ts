import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDecisionPack } from "@/lib/decision-pack/loader";

/**
 * GET /api/student/decision-pack
 * Returns the deterministic Decision Pack for the signed-in student (Phase 30).
 * Read-only and self-scoped: `session.user` is the only allowed subject, so a
 * client can never read another student's pack (no client-supplied id).
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

  const pack = await getDecisionPack(user.id);
  if (!pack) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, pack });
}