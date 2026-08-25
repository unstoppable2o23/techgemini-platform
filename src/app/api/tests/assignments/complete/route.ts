import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReport, KIND_LABELS, questionsFor, type TestKind } from "@/lib/tests";
import { validateSubmission } from "@/lib/career-profile/validate-submission";

const VALID_KINDS: TestKind[] = ["stream", "ideal", "personality", "intelligences", "learning"];

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
    select: {
      status: true,
      answers: true,
      result: true,
      completedAt: true,
      assessmentVersion: true,
      kind: true,
      profileProcessedAt: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: assignment.status,
    answers: assignment.answers,
    report: assignment.result,
    completedAt: assignment.completedAt,
    assessmentVersion: assignment.assessmentVersion,
    kind: assignment.kind,
    profileProcessed: Boolean(assignment.profileProcessedAt),
    meta: await reportMeta(token),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.token !== "string" || !body.token.trim()) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    const { token } = body;

    const assignment = await prisma.testAssignment.findUnique({
      where: { token },
      select: { id: true, kind: true, token: true, status: true, result: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (!VALID_KINDS.includes(assignment.kind as TestKind)) {
      return NextResponse.json({ error: "Invalid assessment kind" }, { status: 400 });
    }

    // ---- completion idempotency: never silently overwrite history ----
    if (assignment.status === "COMPLETED" && assignment.result) {
      return NextResponse.json(
        {
          error: "This assessment has already been completed.",
          alreadyCompleted: true,
          report: assignment.result,
        },
        { status: 409 }
      );
    }

    // ---- server-side answer validation against the authoritative bank ----
    const validation = validateSubmission(questionsFor(assignment.kind as TestKind), body.answers);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const answers = validation.answers;

    // ---- report computed entirely from the authoritative question bank ----
    const report = buildReport(assignment.kind as TestKind, answers);
    const assessmentVersion = "1.0";

    await prisma.testAssignment.update({
      where: { id: assignment.id },
      data: {
        answers,
        status: "COMPLETED",
        completedAt: new Date(),
        result: report,
        assessmentVersion,
      },
    });

    // ---- normalize into the career profile (must not fail completion) ----
    let profileUpdated = false;
    let profileVersion: string | null = null;
    try {
      const profileAssignment = await prisma.testAssignment.findUnique({
        where: { token },
        select: { studentId: true },
      });
      if (profileAssignment) {
        const { generateStudentCareerProfile } = await import(
          "@/lib/career-profile/generate"
        );
        const result = await generateStudentCareerProfile(profileAssignment.studentId);
        profileUpdated = true;
        profileVersion = result ? "1.0" : null;
      }
    } catch (error) {
      console.error("Profile normalization failed (completion preserved):", error);
    }

    return NextResponse.json({
      ok: true,
      report,
      normalizedProfileUpdated: profileUpdated,
      profileVersion,
      meta: await reportMeta(token),
    });
  } catch (error) {
    console.error("Failed to save test result:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
