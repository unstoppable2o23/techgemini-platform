import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * POST — accept an invitation and set the student's own password.
 * - Requires a valid, pending, non-expired token.
 * - Sets the STUDENT role user's password hash (the user was created with a
 *   placeholder hash and no password was ever transmitted).
 * - Marks the invitation accepted and activates the account.
 * Returns success; the client then signs in normally.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const password = body?.password;
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const inv = await prisma.studentInvitation.findUnique({
    where: { token },
    include: { student: true },
  });
  if (!inv) {
    return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  }
  if (inv.status !== "PENDING") {
    return NextResponse.json(
      { error: inv.status === "ACCEPTED" ? "This invitation was already accepted." : "This invitation is no longer valid." },
      { status: 409 }
    );
  }
  if (inv.tokenExpiresAt && inv.tokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This invitation has expired. Ask your counselor for a new one." }, { status: 410 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: inv.studentId },
      data: { passwordHash, isActive: true },
    }),
    prisma.studentInvitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, email: inv.student.email });
}
