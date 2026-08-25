import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  let logoUrl = "";
  let brandName = "";

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { logoUrl: true, tenantId: true },
    });
    if (user?.logoUrl) {
      logoUrl = user.logoUrl;
    }
    if (!logoUrl && user?.tenantId) {
      const t = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { logoUrl: true, brandName: true },
      });
      logoUrl = t?.logoUrl || "";
      brandName = t?.brandName || "";
    }
  }

  if (!logoUrl) {
    const tenant = await prisma.tenant.findFirst({
      select: { brandName: true, logoUrl: true },
    });
    if (tenant) {
      logoUrl = tenant.logoUrl || "";
      brandName = tenant.brandName || "";
    }
  }

  return NextResponse.json({ logoUrl, brandName });
}
