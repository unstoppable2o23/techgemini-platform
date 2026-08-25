import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";


/**
 * Deliberate retake: creates a NEW assignment for the same student and test
 * kind so the previous completion and its history are never overwritten.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const previous = await prisma.testAssignment.findUnique({
      where: { token },
      select: {
        id: true,
        tenantId: true,
        studentId: true,
        kind: true,
        assignedById: true,
      },
    });
    if (!previous) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const student = await prisma.user.findUnique({
      where: { id: previous.studentId },
      select: { firstName: true, lastName: true },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const name = `${student.firstName} ${student.lastName}`;
    const prefix = previous.kind === "stream" ? "STREAM" : previous.kind === "ideal" ? "IDEAL" : previous.kind === "personality" ? "PERSONALITY" : previous.kind === "intelligences" ? "INTELLIGENCE" : "LEARNING";
    const suffix = randomBytes(8).toString("hex").toUpperCase();
    const newToken = `${prefix}-${name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)}-R${suffix}`;

    const assignment = await prisma.testAssignment.create({
      data: {
        tenantId: previous.tenantId,
        studentId: previous.studentId,
        assignedById: previous.assignedById,
        kind: previous.kind,
        token: newToken,
        status: "ASSIGNED",
      },
    });

    return NextResponse.json(
      { ok: true, token: assignment.token, kind: assignment.kind },
      { status: 201 }
    );
  } catch (error) {
    console.error("Retake failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
