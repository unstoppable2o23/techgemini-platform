import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWriteGate } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

/**
 * GET — authorized Student 360 for a student within the caller's org.
 * PATCH — deactivate a student (isActive=false, non-destructive).
 * POST — assign a student to a counselor (both within the org).
 * All operations are tenant-scoped via User.tenantId; cross-org is 404/403.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const student = await prisma.user.findFirst({
    where: { id, tenantId: gate.user.tenantId, role: "STUDENT" },
    select: {
      id: true, firstName: true, lastName: true, email: true, isActive: true, createdAt: true,
      careerProfile: { select: { completeness: true, level: true } },
      studentProfile: {
        select: {
          id: true, status: true, gradeLevel: true, mobile: true,
          counselor: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ student });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const existing = await prisma.user.findFirst({
    where: { id, tenantId: gate.user.tenantId, role: "STUDENT" },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const isActive = body.isActive === true || body.isActive === "true";
  // Only allow explicit true/false; reject anything else to keep non-destructive.
  if (typeof body.isActive !== "boolean" && (body.isActive !== "true" && body.isActive !== "false")) {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, isActive: true },
  });
  return NextResponse.json({ student: updated });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
    include: { studentProfile: true },
  });
  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const counselorId = body.counselorId as string | undefined;
  if (!counselorId) {
    return NextResponse.json({ error: "counselorId is required" }, { status: 400 });
  }

  const counselor = await prisma.user.findFirst({
    where: { id: counselorId, tenantId, role: "COUNSELOR" },
    select: { counselorProfile: { select: { id: true } } },
  });
  if (!counselor?.counselorProfile) {
    return NextResponse.json({ error: "Counselor not found in this organization" }, { status: 404 });
  }

  const updated = await prisma.studentProfile.update({
    where: { userId: student.id },
    data: { counselorId: counselor.counselorProfile.id },
    select: { id: true, counselorId: true },
  });
  return NextResponse.json({ student: updated });
}