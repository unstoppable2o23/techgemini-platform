import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUniversityProfile } from "@/lib/university-profile/profile.ts";
import { buildComparison } from "@/lib/student/comparison.ts";

const MAX_COMPARE = 4;

async function lookupProfile(id: string, dataset: string, ctx?: { studentId?: string; careerId?: string }) {
  const profile = await getUniversityProfile(id, dataset as any, ctx);
  if (profile) return profile;
  // Fallback: try the alternate dataset (shortlist can contain mixed types)
  const fallback = dataset === "indian" ? "global" : "indian";
  return getUniversityProfile(id, fallback as any, ctx);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { institutionIds, dataset, careerId } = body || {};

  if (!Array.isArray(institutionIds) || institutionIds.length === 0) {
    return NextResponse.json({ error: "Provide institutionIds array" }, { status: 400 });
  }
  if (institutionIds.length > MAX_COMPARE) {
    return NextResponse.json({ error: `Comparison limit is ${MAX_COMPARE}. Received ${institutionIds.length}.` }, { status: 400 });
  }

  // Always derive the subject student from the authenticated session. Never
  // trust a client-supplied studentId (cross-student data leak).
  const effectiveStudentId = session.user.id;
  const effectiveDataset = dataset || "indian";

  const profiles = [];
  for (const id of institutionIds.slice(0, MAX_COMPARE)) {
    try {
      const ctx = careerId ? { studentId: effectiveStudentId, careerId } : undefined;
      const profile = await lookupProfile(id, effectiveDataset, ctx);
      if (!profile) continue;
      profiles.push(profile);
    } catch {
      continue;
    }
  }

  const comparison = buildComparison(profiles);
  // Documented: comparison assembled server-side, browser must not stitch together N profile calls
  return NextResponse.json(comparison);
}
