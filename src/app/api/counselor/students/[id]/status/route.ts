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

  const { isActive } = await request.json();

  if (typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be a boolean" },
      { status: 400 }
    );
  }

  const student = await prisma.user.findUnique({
    where: { id },
    include: { studentProfile: true },
  });

  if (!student || student.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (session.user.role === "COUNSELOR") {
    const counselorProfile = await prisma.counselorProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!counselorProfile || student.studentProfile?.counselorId !== counselorProfile.id) {
      return NextResponse.json(
        { error: "Student not assigned to you" },
        { status: 403 }
      );
    }
  }

  await prisma.user.update({
    where: { id },
    data: { isActive },
  });

  return NextResponse.json({ success: true, isActive });
}
