import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadAuthorizedStudent } from "@/lib/counselor/access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "STUDENT") {
    if (session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const auth = await loadAuthorizedStudent(id, session);
    if (!auth.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
    }
  }

  const student = await prisma.user.findUnique({
    where: { id },
    include: { studentProfile: true },
  });
  if (!student || student.role !== "STUDENT") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { passwordHash: _ph, ...safe } = student;
  return NextResponse.json({ student: safe });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "STUDENT") {
    if (session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const auth = await loadAuthorizedStudent(id, session);
    if (!auth.ok) {
      return NextResponse.json({ error: "Forbidden" }, { status: auth.status });
    }
  }

  try {
    const body = await request.json();
    const userData: any = {};
    const profileData: any = {};

    if (body.firstName !== undefined) userData.firstName = body.firstName;
    if (body.lastName !== undefined) userData.lastName = body.lastName;
    if (body.email !== undefined) userData.email = body.email;
    if (body.mobile !== undefined) profileData.mobile = body.mobile || null;
    if (body.gender !== undefined) profileData.gender = body.gender || null;
    if (body.gradeLevel !== undefined) profileData.gradeLevel = body.gradeLevel || null;
    if (body.dateOfBirth !== undefined) profileData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.preferredCareer !== undefined || body.careerNotFinalized !== undefined) {
      profileData.preferredCareer = body.careerNotFinalized ? "" : (body.preferredCareer || null);
    }
    if (body.targetColleges !== undefined || body.collegeNotFinalized !== undefined) {
      profileData.targetColleges = body.collegeNotFinalized ? [] : (body.targetColleges || []);
    }
    if (body.targetCountries !== undefined || body.countryNotFinalized !== undefined) {
      profileData.targetCountries = body.countryNotFinalized ? [] : (body.targetCountries || []);
    }
    if (body.prospectiveSessions !== undefined) profileData.prospectiveSessions = body.prospectiveSessions;
    if (body.studyLevel !== undefined) profileData.studyLevel = body.studyLevel || null;
    if (body.exams !== undefined) profileData.exams = body.exams || [];
    if (body.nationality !== undefined) profileData.nationality = body.nationality || null;
    if (body.state !== undefined) profileData.state = body.state || null;
    if (body.hasEnglishResult !== undefined) profileData.hasEnglishResult = body.hasEnglishResult ?? false;
    if (body.englishTestType !== undefined) profileData.englishTestType = body.englishTestType || null;
    if (body.englishTestScore !== undefined) profileData.englishTestScore = body.englishTestScore || null;
    if (body.englishProficiency !== undefined) profileData.englishProficiency = body.englishProficiency || null;
    if (body.tuitionBudget !== undefined) profileData.tuitionBudget = body.tuitionBudget || null;
    if (body.fundingSource !== undefined) profileData.fundingSource = body.fundingSource || null;
    if (body.preferredIntake !== undefined) profileData.preferredIntake = body.preferredIntake || null;
    if (body.preferredYear !== undefined) profileData.preferredYear = body.preferredYear || null;
    if (body.highestEducation !== undefined) profileData.highestEducation = body.highestEducation || null;
    if (body.averageGrade !== undefined) profileData.averageGrade = body.averageGrade || null;
    if (body.careerPlanNotes !== undefined) profileData.careerPlanNotes = body.careerPlanNotes || null;
    if (body.careerPrefsFilled !== undefined) profileData.careerPrefsFilled = body.careerPrefsFilled;

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id }, data: userData });
    }
    if (Object.keys(profileData).length > 0) {
      await prisma.studentProfile.update({ where: { userId: id }, data: profileData });
    }

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true },
    });

    const { passwordHash: _ph, ...safe } = updated!;
    return NextResponse.json({ student: safe });
  } catch (error) {
    console.error("Failed to update student:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
