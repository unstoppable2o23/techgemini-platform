import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

/**
 * GET — list students within the caller's organization (tenant-scoped with
 * tenantId on User), with assessment completion + assigned counselor. Does not
 * expose unnecessary personal data (only name/email/status/profile-level).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const tenantId = gate.user.tenantId!;

  const students = await prisma.user.findMany({
    where: { tenantId, role: "STUDENT" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      createdAt: true,
      careerProfile: {
        select: { completeness: true, level: true },
      },
      studentProfile: {
        select: {
          id: true,
          status: true,
          gradeLevel: true,
          counselor: {
            select: {
              userId: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          testResults: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      active: s.isActive,
      createdAt: s.createdAt,
      status: s.studentProfile?.status ?? null,
      gradeLevel: s.studentProfile?.gradeLevel ?? null,
      counselorId: s.studentProfile?.counselor?.userId ?? null,
      counselorName: s.studentProfile?.counselor
        ? `${s.studentProfile.counselor.user.firstName} ${s.studentProfile.counselor.user.lastName}`
        : null,
      profileCompleteness: s.careerProfile?.completeness ?? null,
      profileLevel: s.careerProfile?.level ?? null,
      assessmentsCompleted: s.studentProfile?.testResults?.length ?? 0,
    })),
  });
}