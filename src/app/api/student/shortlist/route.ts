import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addShortlist,
  listShortlist,
  SHORTLIST_ITEM_TYPES,
  MAX_UNIVERSITY_SHORTLIST,
  type ShortlistItemType,
} from "@/lib/student/shortlist.ts";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can view shortlists" }, { status: 403 });
  }
  const { searchParams } = request.nextUrl;
  const typeParam = searchParams.get("type") as ShortlistItemType | null;
  const items = await listShortlist(
    session.user.id,
    typeParam ?? undefined
  );

  const enriched = await Promise.all(
    items.map(async (item) => {
      let title = item.itemId;
      let href = "/career-library";
      if (item.itemType === "CAREER") {
        const c = await prisma.career.findUnique({
          where: { id: item.itemId },
          select: { title: true, slug: true, name: true },
        });
        if (c) {
          title = c.title || c.name;
          href = `/career-library/${c.slug}`;
        }
      } else if (item.itemType === "EDUCATION") {
        const deg = await prisma.degree.findUnique({
          where: { id: item.itemId },
          select: { name: true },
        });
        if (deg) {
          title = deg.name;
          href = `/career-library`;
        }
      } else if (item.itemType === "UNIVERSITY") {
        const u = await prisma.university.findUnique({
          where: { id: item.itemId },
          select: { name: true },
        });
        if (u) {
          title = u.name;
          href = `/universities`;
        } else {
          const ind = await prisma.indianInstitution.findUnique({
            where: { id: item.itemId },
            select: { name: true },
          });
          if (ind) {
            title = ind.name;
            href = `/indian-colleges`;
          }
        }
      } else if (item.itemType === "INDIAN_INSTITUTION") {
        // Phase 21: explicit India-institution itemType (distinct from UNIVERSITY)
        const ind = await prisma.indianInstitution.findUnique({
          where: { id: item.itemId },
          select: { name: true },
        });
        if (ind) {
          title = ind.name;
          href = `/indian-colleges`;
        }
      }
      return { ...item, title, href };
    })
  );

  // Phase 21 addition: enrich UNIVERSITY / INDIAN_INSTITUTION items with the shared
  // read-only university-profile view (verification, freshness, program count).
  const withProfiles = await Promise.all(
    enriched.map(async (item) => {
      if (item.itemType !== "UNIVERSITY" && item.itemType !== "INDIAN_INSTITUTION") {
        return { ...item, profile: null };
      }
      const dataset = item.itemType === "UNIVERSITY" ? "global" : "indian";
      try {
        const { getUniversityProfile } = await import("@/lib/university-profile/profile.ts");
        const profile = await getUniversityProfile(item.itemId, dataset as any);
        if (!profile) return { ...item, profile: null };
        return {
          ...item,
          profile: {
            identity: profile.identity,
            programs: profile.programs,
            freshness: profile.freshness,
            hasVerifiedPrograms: profile.hasVerifiedPrograms,
            isEmpty: profile.isEmpty,
          },
        };
      } catch {
        return { ...item, profile: null };
      }
    })
  );

  return NextResponse.json({ items: withProfiles });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can manage shortlists" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const itemType = body.itemType as ShortlistItemType;
    const itemId = body.itemId as string;
    if (
      !itemType ||
      !SHORTLIST_ITEM_TYPES.includes(itemType) ||
      !itemId
    ) {
      return NextResponse.json(
        { error: `itemType (${SHORTLIST_ITEM_TYPES.join("|")}) and itemId are required` },
        { status: 400 }
      );
    }
    // Phase 21: university shortlist is capped at 20 (careers/education are uncapped).
    if (itemType === "UNIVERSITY" || itemType === "INDIAN_INSTITUTION") {
      const count = await prisma.studentShortlist.count({
        where: { studentId: session.user.id, itemType: { in: ["UNIVERSITY", "INDIAN_INSTITUTION"] } },
      });
      if (count >= MAX_UNIVERSITY_SHORTLIST) {
        return NextResponse.json(
          { error: `University shortlist limit reached (${MAX_UNIVERSITY_SHORTLIST}). Remove one before adding another.` },
          { status: 400 }
        );
      }
    }
    const item = await addShortlist({
      studentId: session.user.id,
      itemType,
      itemId,
      note: body.note ?? null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Shortlist add failed:", error);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
