import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.counselorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: "Counselor profile not found" }, { status: 404 });

  return NextResponse.json({ pricing: profile });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { counsellingPrice, assessmentPrice, indiaPrice, internationalPrice, upiId } = await request.json();

    const updated = await prisma.counselorProfile.update({
      where: { userId: session.user.id },
      data: {
        ...(counsellingPrice !== undefined && { counsellingPrice: parseInt(counsellingPrice) }),
        ...(assessmentPrice !== undefined && { assessmentPrice: parseInt(assessmentPrice) }),
        ...(indiaPrice !== undefined && { indiaPrice: parseInt(indiaPrice) }),
        ...(internationalPrice !== undefined && { internationalPrice: parseInt(internationalPrice) }),
        ...(upiId !== undefined && { upiId: upiId || null }),
      },
    });

    return NextResponse.json({ pricing: updated });
  } catch (error) {
    console.error("Failed to update pricing:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
