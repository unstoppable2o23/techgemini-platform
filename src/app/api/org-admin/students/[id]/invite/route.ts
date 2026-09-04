import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWriteGate } from "@/lib/tenant-access";
import { createInvitation, buildInviteUrl } from "@/lib/invitation";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

/**
 * POST — create/re-generate a student invitation for an org member.
 * - Single-use, time-limited token (7 days).
 * - No password is ever generated or returned (student sets their own on accept).
 * - Returns the invite link so admins/mail can deliver it; the email-send itself
 *   is an operational step (no SMTP provider is configured by default), so the
 *   link is also surfaced in the UI for safe fallback delivery.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const tenantId = gate.user.tenantId!;

  const wg = await tenantWriteGate(session);
  if (!wg.ok) {
    return NextResponse.json({ error: wg.error }, { status: wg.status });
  }

  const student = await prisma.user.findFirst({
    where: { id, tenantId, role: "STUDENT" },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!student) {
    return NextResponse.json({ error: "Student not found in this organization" }, { status: 404 });
  }

  // A student who already accepted an invite is already onboarded; still allow a
  // re-invite but reflect that clearly.
  const existing = await prisma.studentInvitation.findUnique({
    where: { studentId: student.id },
  });
  const alreadyAccepted = existing?.status === "ACCEPTED";

  await prisma.user.update({ where: { id: student.id }, data: { isActive: true } });
  const inv = await createInvitation({
    tenantId,
    studentId: student.id,
    emailedTo: student.email,
    createdById: gate.user.id,
  });

  return NextResponse.json(
    {
      invitation: {
        id: inv.id,
        studentEmail: student.email,
        status: inv.status,
        tokenExpiresAt: inv.tokenExpiresAt,
      },
      inviteUrl: buildInviteUrl(inv.token),
      alreadyAccepted,
      note: alreadyAccepted
        ? "This student already accepted a previous invitation. A new link was generated."
        : "Share the invite link with the student. They will set their own password.",
    },
    { status: 201 }
  );
}
