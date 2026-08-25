import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ universities: [], institutions: [] });
  }

  const [universities, institutions] = await Promise.all([
    prisma.university.findMany({
      where: {
        tenantId: session.user.tenantId,
        name: { contains: q, mode: "insensitive" },
      },
      select: { id: true, name: true, country: true, qsRank: true },
      orderBy: { qsRank: "asc" },
      take: 12,
    }),
    prisma.indianInstitution.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, state: true, type: true },
      orderBy: [{ state: "asc" }, { name: "asc" }],
      take: 12,
    }),
  ]);

  return NextResponse.json({ universities, institutions });
}