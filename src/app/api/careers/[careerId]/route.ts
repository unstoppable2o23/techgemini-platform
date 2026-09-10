import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  const { careerId } = await params;

  const career = await prisma.career.findFirst({
    where: { OR: [{ id: careerId }, { slug: careerId }] },
  });

  if (!career) {
    return NextResponse.json({ error: "Career not found" }, { status: 404 });
  }

  return NextResponse.json({ career });
}