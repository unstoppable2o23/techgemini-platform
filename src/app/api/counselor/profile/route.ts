import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COUNSELOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.counselorProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "COUNSELOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { whatsappCountryCode, whatsappNumber, title, phone, counsellingPrice, assessmentPrice, indiaPrice, internationalPrice, upiId } = body;

    const data: any = {};
    if (whatsappCountryCode !== undefined) data.whatsappCountryCode = whatsappCountryCode || null;
    if (whatsappNumber !== undefined) data.whatsappNumber = whatsappNumber || null;
    if (title !== undefined) data.title = title || null;
    if (phone !== undefined) data.phone = phone || null;
    if (counsellingPrice !== undefined) data.counsellingPrice = parseInt(counsellingPrice);
    if (assessmentPrice !== undefined) data.assessmentPrice = parseInt(assessmentPrice);
    if (indiaPrice !== undefined) data.indiaPrice = parseInt(indiaPrice);
    if (internationalPrice !== undefined) data.internationalPrice = parseInt(internationalPrice);
    if (upiId !== undefined) data.upiId = upiId || null;

    const profile = await prisma.counselorProfile.update({
      where: { userId: session.user.id },
      data,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
