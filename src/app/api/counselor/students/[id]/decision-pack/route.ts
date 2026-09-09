import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getDecisionPack } from "@/lib/decision-pack/loader";
import { recordProductEvent } from "@/lib/analytics/record";

/**
 * GET /api/counselor/students/[id]/decision-pack
 * Returns the Decision Pack including the counselor-only summary for a student
 * this counselor is authorized to see (Phase 30). The pack is read-only.
 * `decision_pack_counselor_reviewed` is recorded server-side (never accepted
 * from the student events endpoint), scoped to the signed-in counselor with
 * only a small student reference in meta — no report contents, no assessment
 * answers.
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

  const pack = await getDecisionPack(auth.student.id, { includeCounselor: true });
  if (!pack) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  try {
    await recordProductEvent({
      userId: session?.user?.id ?? auth.student.id,
      event: "decision_pack_counselor_reviewed",
      meta: { studentId: auth.student.id },
    });
  } catch {
    // analytics is best-effort; never fail the pack read
  }

  return NextResponse.json({ ok: true, pack });
}