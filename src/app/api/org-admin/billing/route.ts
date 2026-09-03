import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, canAddStudent, canAddCounselor } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

/**
 * GET — current plan/subscription, usage vs. entitlement, and trial state for
 * the caller's organization. Read-only; the frontend renders this state.
 */
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
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const [studentLimit, counselorLimit, studentCount, counselorCount] = await Promise.all([
    canAddStudent(tenantId),
    canAddCounselor(tenantId),
    prisma.user.count({ where: { tenantId, role: "STUDENT" } }),
    prisma.user.count({ where: { tenantId, role: "COUNSELOR" } }),
  ]);

  const plan = tenant.subscription?.plan ?? null;
  const trialEnded = !!tenant.trialEndsAt && tenant.trialEndsAt.getTime() < Date.now();

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      planType: tenant.planType,
      trialStartedAt: tenant.trialStartedAt,
      trialEndsAt: tenant.trialEndsAt,
      trialEnded,
    },
    subscription: plan
      ? {
          id: tenant.subscription!.id,
          status: tenant.subscription!.status,
          endsAt: tenant.subscription!.endsAt,
          plan: {
            name: plan.name,
            planType: plan.planType,
            maxCounselors: plan.maxCounselors,
            maxStudents: plan.maxStudents,
            hasReports: plan.hasReports,
            hasUniversityRecommendations: plan.hasUniversityRecommendations,
            hasCounselorFeatures: plan.hasCounselorFeatures,
          },
        }
      : null,
    usage: {
      students: { current: studentCount, limit: studentLimit.max, atLimit: !studentLimit.ok },
      counselors: { current: counselorCount, limit: counselorLimit.max, atLimit: !counselorLimit.ok },
    },
    action: trialEnded ? "UPGRADE" : tenant.status === "TRIAL" ? "ACTIVE_TRIAL" : "ACTIVE",
  });
}