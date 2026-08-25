import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_ROLES = ["COUNSELOR", "SUPER_ADMIN", "UNIVERSITY_ADMIN"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, brandName: true, logoUrl: true, primaryColor: true, accentColor: true },
  });
  return NextResponse.json({ tenant });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data: { brandName?: string; logoUrl?: string; primaryColor?: string; accentColor?: string } = {};
    if (typeof body.brandName === "string") data.brandName = body.brandName.slice(0, 80);
    if (typeof body.logoUrl === "string") data.logoUrl = body.logoUrl.slice(0, 40000);
    if (typeof body.primaryColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.primaryColor)) data.primaryColor = body.primaryColor;
    if (typeof body.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(body.accentColor)) data.accentColor = body.accentColor;

    const tenant = await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data,
      select: { id: true, name: true, brandName: true, logoUrl: true, primaryColor: true, accentColor: true },
    });
    return NextResponse.json({ tenant });
  } catch {
    return NextResponse.json({ error: "Failed to update branding" }, { status: 500 });
  }
}