import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUniversityProfile } from "@/lib/university-profile/profile.ts";
import { buildComparison } from "@/lib/student/comparison.ts";
import { getProgramAvailability, availabilityNote } from "@/lib/program-intelligence/availability.ts";
import { prisma } from "@/lib/prisma";

const MAX_COMPARE = 4;

async function lookupProfile(id: string, dataset: string, ctx?: { studentId?: string; careerId?: string }) {
  const profile = await getUniversityProfile(id, dataset as any, ctx);
  if (profile) return profile;
  // Fallback: try the alternate dataset (shortlist can contain mixed types)
  const fallback = dataset === "indian" ? "global" : "indian";
  return getUniversityProfile(id, fallback as any, ctx);
}

/** Phase 28 — attach read-only program availability to each compared profile. */
async function attachAvailability(profile: Awaited<ReturnType<typeof getUniversityProfile>>, dataset: string) {
  if (!profile) return null;
  const kind = dataset === "indian" ? "INDIAN" : "INTERNATIONAL";
  const inst =
    kind === "INDIAN"
      ? await prisma.indianInstitution.findUnique({ where: { id: profile.identity.id }, select: { id: true } })
      : await prisma.university.findUnique({ where: { id: profile.identity.id }, select: { id: true } });
  if (!inst) return { state: "NOT_VERIFIED" as const, verifiedCount: 0, hasVerified: false, rows: [], qualificationCoverage: [], note: availabilityNote({ state: "NOT_VERIFIED", rows: [], verifiedCount: 0, hasVerified: false, qualificationCoverage: [] }) };
  const availability = await getProgramAvailability(prisma, { institutionId: profile.identity.id, kind });
  return { ...availability, note: availabilityNote(availability) };
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
      const availability = await attachAvailability(profile, effectiveDataset);
      profiles.push(availability ? { ...profile, availability } : profile);
    } catch {
      continue;
    }
  }

  const comparison = buildComparison(profiles);
  // Documented: comparison assembled server-side, browser must not stitch together N profile calls
  return NextResponse.json(comparison);
}
