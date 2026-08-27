import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "COUNSELOR" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const gradeLevel = searchParams.get("gradeLevel") || "";
  const studyLevel = searchParams.get("studyLevel") || "";
  const careerInterest = searchParams.get("careerInterest") || "";
  const assessmentStatus = searchParams.get("assessmentStatus") || "";
  const profileComplete = searchParams.get("profileComplete") || "";
  const followUp = searchParams.get("followUp") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 200);

  const profileWhere: Record<string, any> = {};
  if (user.role === "COUNSELOR") {
    profileWhere.counselor = { userId: user.id };
  }
  if (gradeLevel) profileWhere.gradeLevel = gradeLevel;
  if (studyLevel) profileWhere.studyLevel = studyLevel;
  if (careerInterest)
    profileWhere.preferredCareer = { contains: careerInterest, mode: "insensitive" };

  const where: Record<string, any> = {
    role: "STUDENT",
    tenantId: user.tenantId,
  };
  if (Object.keys(profileWhere).length) where.studentProfile = profileWhere;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const students = await prisma.user.findMany({
    where,
    include: {
      careerProfile: { select: { completeness: true } },
      _count: { select: { testAssignments: { where: { status: "COMPLETED" } } } },
      studentProfile: {
        select: {
          id: true,
          gradeLevel: true,
          studyLevel: true,
          preferredCareer: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const profileIds = students
    .map((s) => s.studentProfile?.id)
    .filter(Boolean) as string[];
  const openActions = profileIds.length
    ? await prisma.counselorAction.groupBy({
        by: ["studentId"],
        where: { studentId: { in: profileIds }, completed: false },
        _count: { _all: true },
      })
    : [];
  const openActionMap = new Map(openActions.map((o) => [o.studentId, o._count._all]));

  let rows = students.map((s) => {
    const completed = s._count.testAssignments;
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      assessmentCompleted: completed,
      assessmentTotal: 5,
      profileCompleteness: s.careerProfile?.completeness ?? null,
      preferredCareer: s.studentProfile?.preferredCareer ?? null,
      openActions: openActionMap.get(s.studentProfile?.id ?? "") ?? 0,
    };
  });

  // JS filters that are awkward to express in a single where
  if (assessmentStatus === "complete") rows = rows.filter((r) => r.assessmentCompleted >= 5);
  if (assessmentStatus === "incomplete") rows = rows.filter((r) => r.assessmentCompleted < 5);
  if (assessmentStatus === "partial") rows = rows.filter((r) => r.assessmentCompleted > 0 && r.assessmentCompleted < 5);
  if (profileComplete === "true") rows = rows.filter((r) => (r.profileCompleteness ?? 0) > 0);
  if (profileComplete === "false") rows = rows.filter((r) => (r.profileCompleteness ?? 0) === 0);
  if (followUp === "true") rows = rows.filter((r) => r.openActions > 0);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (Math.max(page, 1) - 1) * limit;
  const paged = rows.slice(start, start + limit);

  return NextResponse.json({ students: paged, total, page: Math.max(page, 1), totalPages });
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
