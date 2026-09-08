import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCareerMatchDetail, sanitizeCareerMatch } from "@/lib/career-matching/engine";
import { prisma } from "@/lib/prisma";
import type { CareerMatch } from "@/lib/career-matching/types";

async function attachEducationPaths(matches: CareerMatch[]) {
  const ids = matches.map((m) => m.careerId).filter(Boolean);
  if (ids.length === 0) return;
  const rows = await prisma.careerEducationPathway.findMany({
    where: { careerId: { in: ids }, type: "DEGREE_PATHWAY" },
    select: {
      careerId: true,
      priority: true,
      degree: { select: { name: true, educationLevel: true } },
    },
    orderBy: [{ careerId: "asc" }, { priority: "asc" }, { degree: { name: "asc" } }],
  });
  const byCareer = new Map<string, { primary: string[]; alternative: string[] }>();
  for (const r of rows) {
    if (!r.degree?.name) continue;
    const label = r.degree.educationLevel
      ? `${r.degree.name} · ${r.degree.educationLevel}`
      : r.degree.name;
    const bucket = r.priority === "ALTERNATIVE" ? "alternative" : "primary";
    const entry = byCareer.get(r.careerId) ?? { primary: [], alternative: [] };
    if (!entry[bucket].includes(label)) entry[bucket].push(label);
    byCareer.set(r.careerId, entry);
  }
  for (const m of matches) {
    (m as any).educationPath = byCareer.get(m.careerId) ?? { primary: [], alternative: [] };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ careerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = session.user;
  if (user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only students can view career matches" },
      { status: 403 }
    );
  }

  const { careerId } = await params;

  try {
    const match = await getCareerMatchDetail(user.id, careerId);
    if (!match) {
      return NextResponse.json(
        { error: "Career match not found" },
        { status: 404 }
      );
    }
    const sanitized = sanitizeCareerMatch(match);
    await attachEducationPaths([sanitized as CareerMatch]);
    return NextResponse.json({ match: sanitized });
  } catch (error) {
    console.error("Career match detail failed:", error);
    return NextResponse.json(
      { error: "Failed to get career match detail" },
      { status: 500 }
    );
  }
}
