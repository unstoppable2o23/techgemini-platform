import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UNASSIGN_WINDOW_MS = 20 * 60 * 1000;

export async function DELETE(
  _request: NextRequest,
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

  const { id } = await params;

  const assignment = await prisma.testAssignment.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          tenantId: true,
          studentProfile: { select: { counselor: { select: { userId: true } } } },
        },
      },
    },
  });

  if (!assignment || assignment.student.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }
  if (
    user.role === "COUNSELOR" &&
    assignment.assignedById !== user.id &&
    assignment.student.studentProfile?.counselor?.userId !== user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const age = Date.now() - new Date(assignment.createdAt).getTime();
  if (age > UNASSIGN_WINDOW_MS) {
    return NextResponse.json(
      { error: "The 20-minute unassign window has expired." },
      { status: 403 }
    );
  }

  await prisma.testAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
