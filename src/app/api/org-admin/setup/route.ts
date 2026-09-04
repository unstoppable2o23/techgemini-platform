import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

export const STEPS = [
  { key: "organization", label: "Organization Details" },
  { key: "counselors", label: "Add Counselors" },
  { key: "students", label: "Add / Import Students" },
  { key: "configure", label: "Configure Basics" },
  { key: "launch", label: "Start Student Journey" },
] as const;

/**
 * GET — first-time organization setup progress.
 * Returns 5 setup steps each with a done flag, plus overall progress.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const tenantId = gate.user.tenantId!;

  const [tenant, counselorCount, studentCount, invitations] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, brandName: true, primaryColor: true, accentColor: true, contactName: true, contactEmail: true },
    }),
    prisma.user.count({ where: { tenantId, role: "COUNSELOR" } }),
    prisma.user.count({ where: { tenantId, role: "STUDENT" } }),
    prisma.studentInvitation.count({ where: { tenantId, status: "PENDING" } }),
  ]);
  if (!tenant) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const doneMap: Record<string, boolean> = {
    organization: !!(tenant.contactName && tenant.contactEmail),
    counselors: counselorCount >= 1,
    students: studentCount >= 1,
    configure: !!(tenant.brandName || tenant.primaryColor || tenant.accentColor),
    launch: studentCount >= 1 && invitations >= 1,
  };

  const steps = STEPS.map((s) => ({
    key: s.key,
    label: s.label,
    done: doneMap[s.key],
  }));
  const completedSteps = steps.filter((s) => s.done).length;

  return NextResponse.json({
    steps,
    completedSteps,
    totalSteps: steps.length,
    done: completedSteps === steps.length,
  });
}
