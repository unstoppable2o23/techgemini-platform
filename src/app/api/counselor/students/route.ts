import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const student = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: "STUDENT",
        tenantId: user.tenantId,
        studentProfile: {
          create: {
            counselor: user.role === "COUNSELOR"
              ? { connect: { userId: user.id } }
              : undefined,
            featureAccess: { create: {} },
          },
        },
      },
      include: {
        studentProfile: {
          include: { featureAccess: true, _count: { select: { testResults: true, appointments: true } } },
        },
      },
    });

    const { passwordHash: _ph, ...safe } = student;
    return NextResponse.json({ student: safe }, { status: 201 });
  } catch (error) {
    console.error("Failed to create student:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
