import { NextRequest, NextResponse } from "next/server";
import { searchPrograms, type ProgramSearchParams } from "@/lib/program-intelligence/search.ts";
import { getShortlistProgramIds } from "@/lib/program-intelligence/search-session.ts";
import type { QualificationKind } from "@/lib/program-intelligence/types.ts";

const QUALIFICATION_VALUES: QualificationKind[] = [
  "DIPLOMA",
  "CERTIFICATE",
  "BACHELORS",
  "PROFESSIONAL_DEGREE",
  "MASTERS",
];

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const qualificationParam = sp.get("qualification");
  const qualification =
    qualificationParam && (QUALIFICATION_VALUES as string[]).includes(qualificationParam)
      ? (qualificationParam as QualificationKind)
      : null;

  const params: ProgramSearchParams = {
    q: sp.get("q"),
    qualification,
    discipline: sp.get("discipline"),
    institutionCountry: sp.get("country"),
    institutionState: sp.get("state"),
    institutionType: sp.get("institutionType"),
    institutionKind: sp.get("institution") === "international" ? "INTERNATIONAL" : sp.get("institution") === "indian" ? "INDIAN" : null,
    limit: Number(sp.get("limit") ?? 12) || 12,
  };

  const result = await searchPrograms({
    ...params,
    shortlistProgramIds: Array.from(await getShortlistProgramIds(request)),
  });
  return NextResponse.json(result);
}