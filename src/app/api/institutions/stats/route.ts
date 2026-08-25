import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.indianInstitution.groupBy({
    by: ["type"],
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    counts[r.type] = r._count._all;
    total += r._count._all;
  }

  return NextResponse.json({
    total,
    universities: counts["University"] || 0,
    colleges: counts["College"] || 0,
    standalone: counts["Standalone"] || 0,
    rnd: counts["R&D Institute"] || 0,
    states: (await prisma.indianInstitution.findMany({
      distinct: ["state"],
      select: { state: true },
      orderBy: { state: "asc" },
    }))
      .map((s) => s.state)
      .filter(Boolean),
  });
}