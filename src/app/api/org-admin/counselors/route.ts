import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, canAddCounselor, tenantWriteGate } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

/**
 * GET — list counselors for the caller's organization (tenant-scoped).
 * Never exposes email-passwords; only ids, names, emails, active state and
 * workload (assigned student count).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const tenantId = gate.user.tenantId!;

  const counselors = await prisma.user.findMany({
    where: { tenantId, role: "COUNSELOR" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      createdAt: true,
      counselorProfile: {
        select: {
          id: true,
          title: true,
          phone: true,
          _count: { select: { students: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    counselors: counselors.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      profileId: c.counselorProfile?.id ?? null,
      title: c.counselorProfile?.title ?? null,
      phone: c.counselorProfile?.phone ?? null,
      assignedStudents: c.counselorProfile?._count.students ?? 0,
      active: c.isActive,
      createdAt: c.createdAt,
    })),
  });
}

/**
 * POST — create a counselor within the organization (no password returned;
 * a temporary placeholder hashed password is set; invites handled separately).
 * Enforces the subscription's maxCounselors entitlement server-side.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const tenantId = gate.user.tenantId!;

  const wg = await tenantWriteGate(session);
  if (!wg.ok) {
    return NextResponse.json({ error: wg.error }, { status: wg.status });
  }

  const limit = await canAddCounselor(tenantId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Counselor limit reached (${limit.existing}/${limit.max}). Upgrade your plan to add more counselors.` },
      { status: 409 }
    );
  }

  let body: { firstName?: string; lastName?: string; email?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { firstName, lastName, email, title } = body;
  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: "firstName, lastName and email are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      role: "COUNSELOR",
      tenantId,
      passwordHash: hashedPlaceholder(),
      counselorProfile: { create: { title: title?.slice(0, 80) ?? null } },
    },
    select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
  });

  return NextResponse.json({ counselor: user }, { status: 201 });
}

function hashedPlaceholder(): string {
  return "$2a$12$" + "placeholderplaceholderplaceholderplaceholderplaceholderplaceholderplaceholderplaceholder".slice(0, 53);
}