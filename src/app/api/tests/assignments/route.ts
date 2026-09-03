import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tokenForStudent, type TestKind } from "@/lib/tests";
import { tenantWriteGate } from "@/lib/tenant-access";

// Counselor-scoped lookups. The relation path differs by model:
// - User.studentProfile (StudentProfile) -> counselor.userId   (used for the POST student lookup)
// - TestAssignment.student (User) -> studentProfile.counselor.userId  (used for the GET list)
const counselorUserScope = (userId: string) => ({
  studentProfile: { counselor: { userId } },
});
const counselorAssignmentScope = (userId: string) => ({
  student: { studentProfile: { counselor: { userId } } },
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignments = await prisma.testAssignment.findMany({
    where: {
      tenantId: user.tenantId,
      ...(user.role === "COUNSELOR" ? counselorAssignmentScope(user.id) : {}),
    },
    include: {
      student: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assignments });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wg = await tenantWriteGate(session);
  if (!wg.ok) {
    return NextResponse.json({ error: wg.error }, { status: wg.status });
  }

  try {
    const { studentId, kind } = await request.json();
    if (!studentId || !["stream", "ideal", "personality", "intelligences", "learning"].includes(kind)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        role: "STUDENT",
        isActive: true,
        tenantId: user.tenantId,
        ...(user.role === "COUNSELOR" ? counselorUserScope(user.id) : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // duplicate check by student + kind (not by deterministic token) so
    // tokens can carry high entropy without breaking permanent-link semantics
    const existing = await prisma.testAssignment.findFirst({
      where: { studentId: student.id, kind },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This test is already assigned to this student.", existingToken: existing.token },
        { status: 409 }
      );
    }

    const token = `${tokenForStudent(student, kind as TestKind)}-${randomBytes(8).toString("hex").toUpperCase()}`;
    const assignment = await prisma.testAssignment.create({
      data: {
        tenantId: user.tenantId,
        studentId: student.id,
        assignedById: user.id,
        kind,
        token,
        status: "ASSIGNED",
      },
      include: {
        student: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error("Failed to assign test:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

