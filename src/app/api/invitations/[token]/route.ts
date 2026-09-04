import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET — validate an invitation token (public, pre-login).
 * Returns only non-sensitive info: student name, organization name, and the
 * token state (valid/expired/used). Does NOT expose emails, hashes, or tokens.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const inv = await prisma.studentInvitation.findUnique({
    where: { token },
    include: {
      student: { select: { firstName: true, lastName: true } },
    },
  });
  if (!inv) {
    return NextResponse.json({ valid: false, reason: "NOT_FOUND" }, { status: 200 });
  }

  if (inv.status !== "PENDING") {
    return NextResponse.json(
      { valid: false, reason: inv.status === "ACCEPTED" ? "ALREADY_ACCEPTED" : inv.status === "REVOKED" ? "REVOKED" : "EXPIRED" },
      { status: 200 }
    );
  }
  if (inv.tokenExpiresAt && inv.tokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ valid: false, reason: "EXPIRED" }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    studentName: `${inv.student.firstName} ${inv.student.lastName}`.trim(),
  });
}
