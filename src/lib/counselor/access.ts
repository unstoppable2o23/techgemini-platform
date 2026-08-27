import { prisma } from "../prisma.ts";

export type SessionLike = {
  user?: {
    id: string;
    role: string;
    tenantId?: string | null;
  } | null;
} | null;

export type StudentLoadResult =
  | { ok: false; status: 401 | 403 | 404 }
  | {
      ok: true;
      student: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        tenantId: string;
        role: string;
        studentProfile: {
          id: string;
          counselorId: string | null;
        } | null;
      };
      counselorProfileId: string | null;
    };

/**
 * Loads a student for counselor access and enforces:
 *  - authentication (401)
 *  - counselor/super-admin role (403)
 *  - assignment to this counselor (403)
 *  - tenant isolation (403) — a counselor cannot reach a student from another tenant
 *
 * SUPER_ADMIN retains the historical full-access behaviour.
 * studentId is the User.id of the student.
 */
export async function loadAuthorizedStudent(
  studentId: string,
  session: SessionLike
): Promise<StudentLoadResult> {
  if (!session?.user?.id) return { ok: false, status: 401 };

  const role = session.user.role;
  if (role !== "COUNSELOR" && role !== "SUPER_ADMIN") {
    return { ok: false, status: 403 };
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      tenantId: true,
      role: true,
      studentProfile: {
        select: { id: true, counselorId: true },
      },
    },
  });

  if (!student || student.role !== "STUDENT") {
    return { ok: false, status: 404 };
  }

  if (role === "SUPER_ADMIN") {
    return {
      ok: true,
      student: {
        ...student,
        studentProfile: student.studentProfile
          ? { id: student.studentProfile.id, counselorId: student.studentProfile.counselorId }
          : null,
      },
      counselorProfileId: student.studentProfile?.counselorId ?? null,
    };
  }

  const cp = await prisma.counselorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!cp) return { ok: false, status: 403 };

  const profile = student.studentProfile;
  if (!profile || profile.counselorId !== cp.id) {
    return { ok: false, status: 403 };
  }

  if (
    session.user.tenantId &&
    student.tenantId !== session.user.tenantId
  ) {
    return { ok: false, status: 403 };
  }

  return {
    ok: true,
    student: {
      ...student,
      studentProfile: { id: profile.id, counselorId: profile.counselorId },
    },
    counselorProfileId: cp.id,
  };
}
