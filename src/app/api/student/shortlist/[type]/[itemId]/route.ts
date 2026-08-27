import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeShortlist, type ShortlistItemType } from "@/lib/student/shortlist.ts";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; itemId: string }> }
) {
  const { type, itemId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can manage shortlists" }, { status: 403 });
  }
  const itemType = type.toUpperCase() as ShortlistItemType;
  if (!["CAREER", "EDUCATION", "UNIVERSITY"].includes(itemType)) {
    return NextResponse.json({ error: "Invalid item type" }, { status: 400 });
  }
  await removeShortlist(session.user.id, itemType, itemId);
  return NextResponse.json({ ok: true });
}
