import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    let body: { token?: unknown; answers?: unknown } = {};
    try {
      body = (await request.json()) as { token?: unknown; answers?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { token, answers } = body;
    if (!token || typeof token !== "string" || !answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const assignment = await prisma.testAssignment.findUnique({
      where: { token },
      select: { id: true, status: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    await prisma.testAssignment.update({
      where: { id: assignment.id },
      data: {
        answers,
        ...(assignment.status === "COMPLETED" ? {} : { status: "IN_PROGRESS" }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
