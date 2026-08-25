import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "COUNSELOR" &&
      session.user.role !== "SUPER_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const allowedKeys = [
    "collegeSearch",
    "collegeFinder",
    "aiOddsCalculator",
    "mockTests",
    "scholarshipHub",
    "appointments",
    "webinars",
    "analytics",
    "careerLibrary",
    "chat",
  ];

  const updateData: Record<string, boolean> = {};
  for (const key of allowedKeys) {
    if (typeof body[key] === "boolean") {
      updateData[key] = body[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No valid feature flags provided" },
      { status: 400 }
    );
  }

  const student = await prisma.studentProfile.findUnique({
    where: { userId: id },
    include: { user: true },
  });

  if (!student || student.user.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (session.user.role === "COUNSELOR") {
    const counselorProfile = await prisma.counselorProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!counselorProfile || student.counselorId !== counselorProfile.id) {
      return NextResponse.json(
        { error: "Student not assigned to you" },
        { status: 403 }
      );
    }
  }

  const featureAccess = await prisma.studentFeatureAccess.upsert({
    where: { studentProfileId: student.id },
    create: {
      studentProfileId: student.id,
      ...updateData,
    },
    update: updateData,
  });

  return NextResponse.json({ success: true, features: featureAccess });
}
