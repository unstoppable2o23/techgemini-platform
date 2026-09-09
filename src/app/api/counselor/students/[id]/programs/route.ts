import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getCareerPrograms } from "@/lib/career-program.ts";
import { listProgramPlans } from "@/lib/counselor/planning.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const auth = await loadAuthorizedStudent(id, session);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 404 ? "Student not found" : "Forbidden" },
      { status: auth.status }
    );
  }

  const careerId = request.nextUrl.searchParams.get("careerId");
  if (!careerId) {
    return NextResponse.json({ programs: [], plans: [] });
  }

  const [programs, plans] = await Promise.all([
    getCareerPrograms(careerId),
    listProgramPlans(auth.student.studentProfile!.id),
  ]);

  const planMap = new Map(
    plans.map((p) => [`${p.careerId}:${p.programId}`, p])
  );

  const merged = (programs ?? []).map((p) => ({
    ...p,
    relationshipType: p.relationshipType?.toLowerCase(),
    plan: planMap.get(`${careerId}:${p.programId}`) ?? null,
  }));

  return NextResponse.json({ programs: merged, plans });
}