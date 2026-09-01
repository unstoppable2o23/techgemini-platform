import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getUniversityProfile } from "@/lib/university-profile/profile.ts";
import { buildComparison } from "@/lib/student/comparison.ts";

const MAX_COMPARE = 4;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;
  const session = await getServerSession(authOptions);
  const auth = await loadAuthorizedStudent(studentId, session);
  if (!auth.ok) return NextResponse.json({ error: auth.status === 404 ? "Student not found" : "Forbidden" }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const { institutionIds, dataset, careerId } = body || {};
  if (!Array.isArray(institutionIds) || institutionIds.length === 0) {
    return NextResponse.json({ error: "Provide institutionIds array" }, { status: 400 });
  }
  if (institutionIds.length > MAX_COMPARE) {
    return NextResponse.json({ error: `Comparison limit is ${MAX_COMPARE}. Received ${institutionIds.length}.` }, { status: 400 });
  }

  const effectiveDataset = dataset || "indian";
  const profiles = [];
  for (const id of institutionIds.slice(0, MAX_COMPARE)) {
    try {
      const profile = await getUniversityProfile(id, effectiveDataset, careerId ? { studentId, careerId } : undefined);
      if (!profile) continue;
      profiles.push(profile);
    } catch {
      continue;
    }
  }

  const comparison = buildComparison(profiles);
  return NextResponse.json(comparison);
}
