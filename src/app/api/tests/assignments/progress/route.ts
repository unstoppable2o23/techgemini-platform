import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { token, answers } = await request.json();
    if (!token || typeof token !== "string" || !answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const assignment = await prisma.testAssignment.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    await prisma.testAssignment.update({
      where: { id: assignment.id },
      data: { answers },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
