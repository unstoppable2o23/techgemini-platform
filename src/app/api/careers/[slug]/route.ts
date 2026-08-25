import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const career = await prisma.career.findUnique({
    where: { slug },
  });

  if (!career) {
    return NextResponse.json({ error: "Career not found" }, { status: 404 });
  }

  return NextResponse.json({ career });
}
