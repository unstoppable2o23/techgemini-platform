import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getDecisionPack } from "@/lib/decision-pack/loader";
import { recordProductEvent } from "@/lib/analytics/record";
import { DecisionPackView } from "@/components/decision-pack/decision-pack-view";

export const dynamic = "force-dynamic";

/**
 * Counselor Decision Pack page (Phase 30).
 * Server-rendered and access-protected via `loadAuthorizedStudent` — only the
 * assigned counselor (or super-admin) can open a student's pack. The
 * `decision_pack_counselor_reviewed` analytics event is recorded server-side,
 * never from a client.
 */
export default async function CounselorStudentDecisionPackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "COUNSELOR" && session.user.role !== "SUPER_ADMIN")
    redirect("/auth/login");

  const auth = await loadAuthorizedStudent(id, session);
  if (!auth.ok) redirect("/students");

  const pack = await getDecisionPack(auth.student.id, { includeCounselor: true });
  if (!pack) redirect("/students");

  try {
    await recordProductEvent({
      userId: session.user.id,
      event: "decision_pack_counselor_reviewed",
      meta: { studentId: auth.student.id },
    });
  } catch {
    // analytics is best-effort
  }

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <Link
          href={`/students/${id}`}
          className="no-print inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Student 360
        </Link>
      </div>
      <DecisionPackView pack={pack} mode="counselor" />
    </div>
  );
}