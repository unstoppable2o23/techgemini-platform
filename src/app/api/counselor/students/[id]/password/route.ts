import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const student = await prisma.user.findUnique({ where: { id } });
    if (!student || student.role !== "STUDENT") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (user.role === "COUNSELOR") {
      const assigned = await prisma.studentProfile.findFirst({
        where: { userId: id, counselor: { userId: user.id } },
      });
      if (!assigned) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return NextResponse.json({ message: "Password updated" });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
