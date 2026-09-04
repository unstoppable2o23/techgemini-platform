export type NormalizedRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gradeLevel: string;
  counselor: string;
};

export type RowError = { row: number; email?: string; error: string };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRow(r: Record<string, string>): NormalizedRow {
  return {
    firstName: (r.firstName ?? r.firstname ?? r["first name"] ?? "")
      .trim(),
    lastName: (r.lastName ?? r.lastname ?? r["last name"] ?? "")
      .trim(),
    email: (r.email ?? "").trim().toLowerCase(),
    phone: (r.phone ?? r.mobile ?? "").trim(),
    gradeLevel: (r.gradeLevel ?? r.grade ?? r["grade level"] ?? "")
      .trim(),
    counselor: (r.counselor ?? "").trim().toLowerCase(),
  };
}

/**
 * Validate raw parsed CSV rows and assign counselors by email.
 * Pure — does not touch the database.
 *
 * @param rows       parsed records (object per column)
 * @param counselors map of counselor email -> { userId, profileId }
 * @returns per-row errors plus a validated array (with counselorProfileId)
 */
export function validateCsvRows(
  rows: Record<string, string>[],
  counselors: Record<string, { userId: string; profileId: string }> = {},
  existingEmails: string[] = []
): {
  errors: RowError[];
  validated: Array<NormalizedRow & { counselorProfileId?: string }>;
} {
  const errors: RowError[] = [];
  const validated: Array<NormalizedRow & { counselorProfileId?: string }> = [];
  // Emails that already exist (in-org or in-file) to prevent duplicates
  const seen = new Set(existingEmails.map((e) => e.toLowerCase()));

  rows.forEach((raw, idx) => {
    const row = idx + 2; // +2 for header + 1-indexed
    const n = normalizeRow(raw);

    if (!n.firstName || !n.lastName) {
      errors.push({ row, email: n.email, error: "Missing first or last name" });
      return;
    }
    if (!n.email || !EMAIL_RE.test(n.email)) {
      errors.push({
        row,
        error: `Invalid email: "${n.email || "(empty)"}"`,
      });
      return;
    }
    if (n.firstName.length > 80 || n.lastName.length > 80 || n.email.length > 254) {
      errors.push({ row, email: n.email, error: "Field exceeds maximum length" });
      return;
    }
    if (seen.has(n.email)) {
      errors.push({ row, email: n.email, error: "Duplicate email in this file" });
      return;
    }

    let counselorProfileId: string | undefined;
    if (n.counselor) {
      const c = counselors[n.counselor];
      if (!c) {
        errors.push({
          row,
          email: n.email,
          error: `Counselor not found: "${n.counselor}"`,
        });
        return;
      }
      counselorProfileId = c.profileId;
    }

    seen.add(n.email);
    validated.push({ ...n, counselorProfileId });
  });

  return { errors, validated };
}
