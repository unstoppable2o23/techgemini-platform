import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const career = await prisma.career.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!career) {
    return NextResponse.json({ error: "Career not found" }, { status: 404 });
  }

  const traits = await prisma.careerTrait.findMany({
    where: { careerId: career.id },
    select: { dimension: true, value: true, weight: true },
  });

  return NextResponse.json({ career, traits });
}
