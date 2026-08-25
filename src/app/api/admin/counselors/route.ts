import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const counselors = await prisma.user.findMany({
    where: { role: "COUNSELOR", tenantId: session.user.tenantId },
    include: { counselorProfile: true },
    orderBy: { createdAt: "desc" },
  });

  const safeCounselors = counselors.map(({ passwordHash: _ph, ...rest }) => rest);

  return NextResponse.json({ counselors: safeCounselors });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { firstName, lastName, email, password, title, phone, whatsappCountryCode, whatsappNumber, counsellingPrice, assessmentPrice, indiaPrice, internationalPrice } = await request.json();
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: "COUNSELOR",
        tenantId: session.user.tenantId,
        counselorProfile: {
          create: {
            title: title || null,
            phone: phone || null,
            whatsappCountryCode: whatsappCountryCode || null,
            whatsappNumber: whatsappNumber || null,
            counsellingPrice: counsellingPrice ? parseInt(counsellingPrice) : 2000,
            assessmentPrice: assessmentPrice ? parseInt(assessmentPrice) : 4000,
            indiaPrice: indiaPrice ? parseInt(indiaPrice) : 14000,
            internationalPrice: internationalPrice ? parseInt(internationalPrice) : 95000,
          },
        },
      },
      include: { counselorProfile: true },
    });

    const { passwordHash: _ph, ...safe } = user;
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (error) {
    console.error("Failed to create counselor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
