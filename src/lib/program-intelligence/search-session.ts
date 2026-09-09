/**
 * Phase 28 — shortlist-aware session helper for program APIs.
 * Returns the student's shortlisted program ids (empty set when not a student),
 * never throws — public pages must keep working.
 */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getShortlistProgramIds(
  _request: NextRequest
): Promise<Set<string>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "STUDENT") return new Set<string>();
    const rows = await prisma.studentShortlist.findMany({
      where: { studentId: session.user.id, itemType: "PROGRAM" },
      select: { itemId: true },
    });
    return new Set(rows.map((r) => r.itemId));
  } catch {
    return new Set<string>();
  }
}