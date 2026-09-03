import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

/**
 * GET — single counselor within the org (tenant-scoped).
 * PATCH — deactivate/reactivate a counselor (never deletes; isActive=false)
 *         and optionally reassign its students to another counselor.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const counselor = await prisma.user.findFirst({
    where: { id, tenantId: gate.user.tenantId, role: "COUNSELOR" },
    select: {
      id: true, firstName: true, lastName: true, email: true, isActive: true,
      counselorProfile: { select: { id: true, title: true, _count: { select: { students: true } } } },
    },
  });
  if (!counselor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ counselor });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const tenantId = gate.user.tenantId!;

  const counselor = await prisma.user.findFirst({
    where: { id, tenantId, role: "COUNSELOR" },
  });
  if (!counselor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const deactivated = body.isActive === false || body.isActive === "false";
  const reactivated = body.isActive === true || body.isActive === "true";

  await prisma.$transaction(async (tx) => {
    if (deactivated) {
      await tx.user.update({ where: { id }, data: { isActive: false } });
    } else if (reactivated) {
      await tx.user.update({ where: { id }, data: { isActive: true } });
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
  return NextResponse.json({ counselor: updated });
}