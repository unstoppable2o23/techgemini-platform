import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

export async function GET() {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }

  const tenantId = gate.user.tenantId!;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: { include: { plan: true } } },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const studentIds = await prisma.user.findMany({
    where: { tenantId, role: "STUDENT" },
    select: { id: true, studentProfile: { select: { id: true, status: true } } },
  });
  const profileIds = studentIds
  .map((s) => s.studentProfile?.id)
  .filter((id): id is string => !!id);
  const activeStudents = studentIds.filter(
    (s) => s.studentProfile?.status === "ONLINE" || s.studentProfile?.status === "IN_TEST"
  ).length;

  const [counselorCount, studentCount, assessmentsCompleted, counselorNotes, counselorActions, feedbackCount] =
    await Promise.all([
      prisma.user.count({ where: { tenantId, role: "COUNSELOR" } }),
      prisma.user.count({ where: { tenantId, role: "STUDENT" } }),
      prisma.testResult.count({ where: { test: { tenantId } } }),
      prisma.counselorNote.count({ where: { studentId: { in: profileIds } } }),
      prisma.counselorAction.count({ where: { studentId: { in: profileIds } } }),
      prisma.counselorRecommendationFeedback.count({ where: { studentId: { in: profileIds } } }),
    ]);

  const plan = tenant.subscription?.plan ?? null;
  const trialEnded = !!tenant.trialEndsAt && tenant.trialEndsAt.getTime() < Date.now();

  return NextResponse.json({
    organization: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      brandName: tenant.brandName,
      logoUrl: tenant.logoUrl,
      contactName: tenant.contactName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      status: tenant.status,
      planType: tenant.planType,
      trialEndsAt: tenant.trialEndsAt,
      trialEnded,
    },
    subscription: plan
      ? {
          planType: plan.planType,
          name: plan.name,
          status: tenant.subscription!.status,
          maxCounselors: plan.maxCounselors,
          maxStudents: plan.maxStudents,
          hasReports: plan.hasReports,
          hasUniversityRecommendations: plan.hasUniversityRecommendations,
          hasCounselorFeatures: plan.hasCounselorFeatures,
        }
      : null,
    usage: {
      counselorCount,
      studentCount,
      activeStudents,
      assessmentsCompleted,
      counselorNotes,
      counselorActions,
      feedbackCount,
    },
  });
}