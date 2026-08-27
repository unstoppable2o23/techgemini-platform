import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addShortlist,
  listShortlist,
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
      }
      return { ...item, title, href };
    })
  );

  return NextResponse.json({ items: enriched });
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
      !["CAREER", "EDUCATION", "UNIVERSITY"].includes(itemType) ||
      !itemId
    ) {
      return NextResponse.json(
        { error: "itemType (CAREER|EDUCATION|UNIVERSITY) and itemId are required" },
        { status: 400 }
      );
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
