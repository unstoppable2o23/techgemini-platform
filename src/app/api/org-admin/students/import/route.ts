import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole, tenantWriteGate, canAddStudent } from "@/lib/tenant-access";
import { parse } from "csv-parse/sync";
import { validateCsvRows } from "@/lib/csv-import";

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

const MAX_ROWS = 1000;

/**
 * POST — bulk-import students from a CSV file.
 *
 * Accepted columns (case-insensitive):
 *   firstName | firstname
 *   lastName  | lastname
 *   email
 *   phone (optional)
 *   gradeLevel | grade (optional)
 *   counselor (optional, counselor email)
 *
 * Behavior:
 *   - Validates every row and reports clear per-row errors.
 *   - Prevents duplicate accounts (same email within the org / platform).
 *   - Enforces the subscription student-limit entitlement.
 *   - Creates User (STUDENT) + StudentProfile + featureAccess.
 *   - Students are imported ACTIVE but INVITED (account setup via invite link).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const gate = await requireRole(session, ADMIN_ROLES);
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }
  const tenantId = gate.user.tenantId!;

  const wg = await tenantWriteGate(session);
  if (!wg.ok) {
    return NextResponse.json({ error: wg.error }, { status: wg.status });
  }

  let csv: string;
  let sample = false;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (file instanceof File) {
      csv = await file.text();
    } else {
      return NextResponse.json({ error: "Missing CSV file" }, { status: 400 });
    }
    sample = form.get("sample") === "true";
  } catch {
    return NextResponse.json({ error: "Invalid upload. Upload a CSV file." }, { status: 400 });
  }

  if (!csv || !csv.trim()) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }

  let records: Record<string, string>[] = [];
  try {
    records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not parse the CSV. Check that it has a header row and valid columns." },
      { status: 400 }
    );
  }
  if (records.length === 0) {
    return NextResponse.json({ error: "No data rows found in the CSV" }, { status: 400 });
  }
  if (records.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 });
  }

  const limit = await canAddStudent(tenantId);

  // Load tenant's existing counselors by email + existing student emails in org
  const [counselors, existingStudents] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, role: "COUNSELOR" },
      select: { id: true, email: true, counselorProfile: { select: { id: true } } },
    }),
    prisma.user.findMany({
      where: { tenantId, role: "STUDENT" },
      select: { email: true },
    }),
  ]);
  const counselorByEmail: Record<string, { userId: string; profileId: string }> = {};
  for (const c of counselors) {
    if (c.counselorProfile) {
      counselorByEmail[c.email.toLowerCase()] = {
        userId: c.id,
        profileId: c.counselorProfile.id,
      };
    }
  }
  const existingEmails = existingStudents.map((s) => s.email);

  const { errors, validated } = validateCsvRows(
    records,
    counselorByEmail,
    existingEmails
  );

  if (!sample && errors.length > 0) {
    return NextResponse.json(
      { error: "Some rows could not be imported", rows: validated.length, errors, created: 0, skipped: errors.length },
      { status: 422 }
    );
  }

  // Entitlement: count current + would-create
  const currentStudentCount = existingStudents.length;
  const wouldCreate = validated.length;
  if (limit.ok && currentStudentCount + wouldCreate > limit.max) {
    return NextResponse.json(
      {
        error: `Student limit reached: ${currentStudentCount}/${limit.max} would exceed the plan limit.`,
        rows: validated.length, created: 0, errors,
      },
      { status: 409 }
    );
  }
  if (sample) {
    // Return a dry-run preview without creating anything
    return NextResponse.json({
      sample: true,
      rows: validated.length,
      errors,
      preview: validated.slice(0, 20).map((v) => ({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        counselor: v.counselorProfileId ? "assigned" : "unassigned",
      })),
    });
  }

  let created = 0;
  for (const v of validated) {
    try {
      await prisma.user.create({
        data: {
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          passwordHash: hashedPlaceholder(),
          role: "STUDENT",
          tenantId,
          studentProfile: {
            create: {
              mobile: v.phone?.slice(0, 20) || undefined,
              gradeLevel: v.gradeLevel?.slice(0, 40) || undefined,
              counselorId: v.counselorProfileId ?? undefined,
              featureAccess: { create: {} },
            },
          },
        },
      });
      created++;
    } catch {
      errors.push({ row: -1, email: v.email, error: "Failed to create student" });
    }
  }

  return NextResponse.json({
    created,
    skipped: errors.filter((e) => !e.row).length,
    errors,
    message: `Imported ${created} student(s). You can now invite them to set up their account.`,
  }, { status: 200 });
}

function hashedPlaceholder(): string {
  return "$2a$12$" + "placeholderplaceholderplaceholderplaceholderplaceholderplaceholderplaceholderplaceholder".slice(0, 53);
}
