import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReport, KIND_LABELS, type TestKind } from "@/lib/tests";

async function reportMeta(token: string) {
  const assignment = await prisma.testAssignment.findUnique({
    where: { token },
    select: {
      kind: true,
      student: {
        select: {
          firstName: true,
          lastName: true,
          tenantId: true,
          studentProfile: {
            select: {
              counselor: {
                select: {
                  user: { select: { logoUrl: true, firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!assignment) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: assignment.student.tenantId },
    select: { brandName: true, logoUrl: true },
  });

  const counselor = assignment.student.studentProfile?.counselor?.user;
  return {
    studentName: `${assignment.student.firstName} ${assignment.student.lastName}`.trim(),
    testTitle: KIND_LABELS[assignment.kind as TestKind],
    logoUrl: counselor?.logoUrl || tenant?.logoUrl || null,
    brandName: tenant?.brandName || "",
    counselorName: counselor ? `${counselor.firstName} ${counselor.lastName}`.trim() : null,
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const assignment = await prisma.testAssignment.findUnique({
    where: { token },
    select: { status: true, answers: true, result: true, completedAt: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: assignment.status,
    answers: assignment.answers,
    report: assignment.result,
    completedAt: assignment.completedAt,
    meta: await reportMeta(token),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, answers } = await request.json();
    if (!token || typeof token !== "string" || !answers || typeof answers !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const assignment = await prisma.testAssignment.findUnique({
      where: { token },
      select: { id: true, kind: true, token: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const report = buildReport(assignment.kind as TestKind, answers);

    await prisma.testAssignment.update({
      where: { id: assignment.id },
      data: {
        answers,
        status: "COMPLETED",
        completedAt: new Date(),
        result: report,
      },
    });

    return NextResponse.json({
      ok: true,
      report,
      meta: await reportMeta(assignment.token),
    });
  } catch (error) {
    console.error("Failed to save test result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
