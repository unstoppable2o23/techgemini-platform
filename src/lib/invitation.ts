import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export function buildInviteUrl(token: string): string {
  const base =
    process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

/**
 * Create (or re-generate) a single-use, time-limited invitation for a student.
 * Existing pending invitations are replaced with a fresh token so that a
 * re-invite invalidates the previous link. Never carries a password.
 */
export async function createInvitation(params: {
  tenantId: string;
  studentId: string;
  emailedTo: string;
  createdById?: string | null;
}) {
  const token = generateInviteToken();
  const tokenExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const existing = await prisma.studentInvitation.findUnique({
    where: { studentId: params.studentId },
  });
  if (existing) {
    return prisma.studentInvitation.update({
      where: { studentId: params.studentId },
      data: {
        token,
        tokenExpiresAt,
        status: "PENDING",
        createdById: params.createdById ?? null,
        emailedTo: params.emailedTo,
        acceptedAt: null,
      },
    });
  }
  return prisma.studentInvitation.create({
    data: {
      tenantId: params.tenantId,
      studentId: params.studentId,
      emailedTo: params.emailedTo,
      createdById: params.createdById ?? null,
      token,
      tokenExpiresAt,
    },
  });
}
