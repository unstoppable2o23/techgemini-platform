import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id }, include: { counselorProfile: true } });
    if (!existing || existing.role !== "COUNSELOR" || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Counselor not found" }, { status: 404 });
    }

    const body = await request.json();
    const userData: any = {};
    const profileData: any = {};

    if (body.firstName !== undefined) userData.firstName = body.firstName;
    if (body.lastName !== undefined) userData.lastName = body.lastName;
    if (body.email !== undefined) {
      const emailConflict = await prisma.user.findFirst({ where: { email: body.email, id: { not: id } } });
      if (emailConflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      userData.email = body.email;
    }
    if (body.password) {
      userData.passwordHash = await bcrypt.hash(body.password, 12);
    }
    if (body.isActive !== undefined) userData.isActive = body.isActive;

    if (body.title !== undefined) profileData.title = body.title || null;
    if (body.phone !== undefined) profileData.phone = body.phone || null;
    if (body.whatsappCountryCode !== undefined) profileData.whatsappCountryCode = body.whatsappCountryCode || null;
    if (body.whatsappNumber !== undefined) profileData.whatsappNumber = body.whatsappNumber || null;
    if (body.counsellingPrice !== undefined) profileData.counsellingPrice = parseInt(body.counsellingPrice);
    if (body.assessmentPrice !== undefined) profileData.assessmentPrice = parseInt(body.assessmentPrice);
    if (body.indiaPrice !== undefined) profileData.indiaPrice = parseInt(body.indiaPrice);
    if (body.internationalPrice !== undefined) profileData.internationalPrice = parseInt(body.internationalPrice);
    if (body.upiId !== undefined) profileData.upiId = body.upiId || null;

    if (body.logoUrl !== undefined) {
      userData.logoUrl = body.logoUrl || null;
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id }, data: userData });
    }
    if (Object.keys(profileData).length > 0) {
      if (existing.counselorProfile) {
        await prisma.counselorProfile.update({ where: { userId: id }, data: profileData });
      } else {
        await prisma.counselorProfile.create({ data: { userId: id, ...profileData } });
      }
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { counselorProfile: true },
    });

    const { passwordHash: _ph, ...safe } = updated!;
    return NextResponse.json({ user: safe });
  } catch (error) {
    console.error("Failed to update counselor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
