/**
 * Phase 28 — side-by-side program comparison (up to 3).
 *
 * Comparison is descriptive, never a ranking: no fabricated scores, no "this
 * one is better" claims. Availability rows are only counted when the
 * institution-offered Program row is VERIFIED.
 */
import { prisma } from "@/lib/prisma";
import type { ProgramComparison, ProgramCompareRow } from "./types.ts";
import { normalizeQualification, disciplineOf, educationStageFitOf, nextStepOf } from "./normalize.ts";
import { getAdmissionInfo } from "./admissions.ts";
import { coversAcademicProgram } from "./availability.ts";

export const MAX_PROGRAM_COMPARE = 3;

async function careerLines(programIds: string[]): Promise<Map<string, string[]>> {
  const rows = await prisma.careerProgramMapping.findMany({
    where: { programId: { in: programIds }, isActive: true },
    select: { programId: true, career: { select: { name: true } } },
  });
  const map = new Map<string, string[]>();
  for (const r of rows as any[]) {
    const list = map.get(r.programId) ?? [];
    list.push(r.career.name);
    map.set(r.programId, list);
  }
  return map;
}

async function verifiedInstitutionLines(programNames: string[]): Promise<Map<string, string[]>> {
  const rows = await prisma.program.findMany({
    where: { verificationStatus: "VERIFIED", name: { in: programNames } },
    take: 200,
    select: {
      name: true,
      indianInstitution: { select: { name: true } },
      university: { select: { name: true } },
    },
  });
  const map = new Map<string, string[]>();
  for (const r of (rows as any[])) {
    const inst = r.indianInstitution?.name ?? r.university?.name ?? "Verified institution";
    const hit = (r.name as string).trim();
    for (const ap of programNames) {
      if (coversAcademicProgram(ap, hit)) {
        const list = map.get(hit) ?? [];
        if (!list.includes(inst)) list.push(inst);
        map.set(hit, list);
      }
    }
  }
  return map;
}

export async function comparePrograms(programIds: string[]): Promise<ProgramComparison> {
  const ids = Array.from(new Set(programIds)).slice(0, MAX_PROGRAM_COMPARE);
  const programs = await prisma.academicProgram.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, name: true, slug: true, level: true, category: true },
    orderBy: { name: "asc" },
  });
  // Keep caller order: reorder to [ids] sequence for stable output.
  const byId = new Map(programs.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);

  const [careerMap, instMap] = await Promise.all([
    careerLines(ordered.map((p) => p.id)),
    verifiedInstitutionLines(ordered.map((p) => p.name)),
  ]);

  const row = (key: string, label: string, get: (p: (typeof ordered)[number]) => string): ProgramCompareRow => {
    const values = ordered.map((p) => get(p) || "Not available");
    return {
      key,
      label,
      values,
      allUnavailable: values.every((v) => v === "Not available"),
    };
  };

  const rows: ProgramCompareRow[] = [
    row("program", "Program", (p) => p.name),
    row("qualification", "Qualification", (p) => normalizeQualification(p.level)?.name ?? "Not classified"),
    row("qualificationFamily", "Qualification family", (p) => normalizeQualification(p.level)?.level ?? "Not classified"),
    row("discipline", "Discipline", (p) => disciplineOf(p.category).name),
    row("educationStage", "Education stage", (p) => educationStageFitOf(p.level).map((s) => s.split(" — ")[0]).join(", ") || "Not specified"),
    row("careers", "Career paths referencing this program", (p) => {
      const c = careerMap.get(p.id) ?? [];
      return c.length ? `${c.length} path${c.length === 1 ? "" : "s"}` : "No mapped career paths";
    }),
    row("admission", "Admission route", (p) => {
      const a = getAdmissionInfo({ programName: p.name, level: p.level, category: p.category });
      if (!a) return "Verify with official admissions sources";
      return [a.entranceExam, a.admissionType].filter(Boolean).join(" · ");
    }),
    row("availability", "Verified availability", (p) => {
      const insts = instMap.get(p.name.trim()) ?? [];
      return insts.length ? `Verified at ${insts.length} institution${insts.length === 1 ? "" : "s"}` : "Program availability not verified";
    }),
    row("nextStep", "Next step", (p) =>
      nextStepOf(p.level, getAdmissionInfo({ programName: p.name, level: p.level, category: p.category }))
    ),
  ];

  const rowOrder = rows.map((r) => r.key);

  return {
    programs: ordered.map((p) => ({ id: p.id, name: p.name })),
    rows,
    rowOrder,
    maxCompare: MAX_PROGRAM_COMPARE,
    clarifier:
      "Comparison is descriptive and never a ranking. Availability counts only institution-offered programs tied to a verified source; unverified rows surface as 'not verified', never as guesses.",
  };
}