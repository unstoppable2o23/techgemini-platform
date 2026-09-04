import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWriteGate } from "@/lib/tenant-access";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

/**
 * PUT — update organization / branding settings.
 * Allows admins to complete the setup steps (org details + configure basics):
 * contact name/email/phone, brand name, colors, and logo URL.
 */
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const wg = await tenantWriteGate(session);
  if (!wg.ok) {
    return NextResponse.json({ error: wg.error }, { status: wg.status });
  }
  const tenantId = gate.user.tenantId!;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const str = (v: unknown, max = 120) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

  const contactName = str(body.contactName);
  const contactEmail = str(body.contactEmail, 120);
  const contactPhone = str(body.contactPhone, 24);
  const brandName = str(body.brandName);
  const primaryColor = str(body.primaryColor, 20);
  const accentColor = str(body.accentColor, 20);
  const logoUrl = str(body.logoUrl, 500);

  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Invalid contact email" }, { status: 400 });
  }
  const validColor = (c?: string) => !c || /^#[0-9a-fA-F]{6}$/.test(c);
  if (!validColor(primaryColor) || !validColor(accentColor)) {
    return NextResponse.json({ error: "Colors must be hex values like #0F172A" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (contactName !== undefined) data.contactName = contactName;
  if (contactEmail !== undefined) data.contactEmail = contactEmail;
  if (contactPhone !== undefined) data.contactPhone = contactPhone;
  if (brandName !== undefined) data.brandName = brandName;
  if (primaryColor !== undefined) data.primaryColor = primaryColor;
  if (accentColor !== undefined) data.accentColor = accentColor;
  if (logoUrl !== undefined) data.logoUrl = logoUrl;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No settings provided" }, { status: 400 });
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data,
    select: {
      id: true,
      name: true,
      brandName: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      primaryColor: true,
      accentColor: true,
      logoUrl: true,
    },
  });
  return NextResponse.json({ organization: updated });
}
