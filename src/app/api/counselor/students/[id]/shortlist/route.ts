import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { prisma } from "@/lib/prisma";
import { getUniversityProfile } from "@/lib/university-profile/profile.ts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;
  const session = await getServerSession(authOptions);
  const auth = await loadAuthorizedStudent(studentId, session);
  if (!auth.ok) return NextResponse.json({ error: auth.status === 404 ? "Student not found" : "Forbidden" }, { status: auth.status });

  const items = await prisma.studentShortlist.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const enriched = [];
  for (const item of items) {
    if (item.itemType !== "UNIVERSITY" && item.itemType !== "INDIAN_INSTITUTION") continue;
    const dataset = item.itemType === "UNIVERSITY" ? "global" : "indian";
    try {
      const profile = await getUniversityProfile(item.itemId, dataset as any);
      if (!profile) continue;
      enriched.push({
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        title: profile.identity.name,
        note: item.note,
        createdAt: item.createdAt,
        profile: {
          identity: profile.identity,
          programs: profile.programs,
          freshness: profile.freshness,
          hasPrograms: profile.hasPrograms,
          hasVerifiedPrograms: profile.hasVerifiedPrograms,
          isEmpty: profile.isEmpty,
        },
      });
    } catch {
      enriched.push({
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        title: item.itemId,
        note: item.note,
        createdAt: item.createdAt,
        profile: null,
      });
    }
  }

  // Counselor view is read-only over student shortlist data — same data as student, no fork
  return NextResponse.json({ items: enriched, total: enriched.length, max: 20 });
}
