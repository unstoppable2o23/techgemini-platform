/**
 * Phase 23.2 — Part A: Polytechnic hardening golden suite.
 *
 * Validates the Phase 23.2 correction contract:
 *   - Degree-only institution queries never surface "Polytechnic" — or any
 *     "… (Diploma)" — institutions via category matching.
 *   - Diploma context ("Diploma in …") still maps to polytechnic institutions.
 *   - Honest empties: a degree that only matches diploma-level institutions
 *     returns zero institutions with mappingBasis "none", not fabricated rows.
 *   - No verified Program rows are ever attached to diploma-level institutions.
 *   - Core counts (University / IndianInstitution) stay unchanged.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  getInstitutionsForDegrees,
  isDiplomaLevelInstitutionType,
  institutionQualificationLabel,
  deriveInstitutionTypeTokens,
} from "../src/lib/education-institutions/service.ts";
import { getSingleCandidate } from "../src/lib/university-matching/candidate.ts";

const prisma = new PrismaClient();

const DIPLOMA_TOKEN = /polytechnic/i;

async function degreeByName(name) {
  const d = await prisma.degree.findFirst({ where: { name } });
  assert.ok(d, `degree ${name} must exist`);
  return d;
}

describe("Phase 23.2 — polytechnic hardening (golden)", () => {
  test("G1: isDiplomaLevelInstitutionType classifies polytechnic and (Diploma) variants, but not degree-granting types", () => {
    for (const t of ["Technical/Polytechnic", "Polytechnic", "Government Polytechnic", "Nursing (Diploma) Institute", "Technical (Diploma)"]) {
      assert.ok(isDiplomaLevelInstitutionType(t), `${t} must be diploma-level`);
    }
    for (const t of ["University", "Affiliated College", "Deemed University", "Technical", "State Government University"]) {
      assert.ok(!isDiplomaLevelInstitutionType(t), `${t} must NOT be diploma-level`);
    }
    assert.ok(!isDiplomaLevelInstitutionType(null), "null type is not diploma-level");
  });

  test("G2: institutionQualificationLabel distinguishes Diploma / Polytechnic honest labels", () => {
    assert.equal(institutionQualificationLabel("Technical/Polytechnic"), "Diploma / Polytechnic");
    assert.equal(institutionQualificationLabel("Nursing (Diploma) Institute"), "Diploma");
    assert.equal(institutionQualificationLabel("Affiliated College"), null);
    assert.equal(institutionQualificationLabel("University"), null);
    assert.equal(institutionQualificationLabel(null), null);
  });

  test("G3: degree-only B.E./B.Tech category discovery is never polytechnic", async () => {
    const deg = await degreeByName("B.TECH/B.E. Computer Science");
    const r = await getInstitutionsForDegrees([deg.id], { limit: 100 });
    assert.ok(["none", "verified-program", "curated", "institutionType-category"].includes(r.mappingBasis), `unexpected basis ${r.mappingBasis}`);
    if (r.mappingBasis === "institutionType-category") {
      for (const inst of r.institutions) {
        assert.ok(!DIPLOMA_TOKEN.test(inst.institutionType || ""), `${inst.name} is diploma-level but surfaced for a degree-only query`);
      }
    }
  });

  test("G4: M.TECH Environmental Engineering yields an honest empty (no polytechnic leak)", async () => {
    const deg = await degreeByName("M.TECH Environmental Engineering");
    const r = await getInstitutionsForDegrees([deg.id], { limit: 100 });
    assert.equal(r.total, 0, `M.TECH should resolve to no non-diploma institutions, got ${r.total}`);
    assert.notEqual(r.mappingBasis, "institutionType-category", "honest empty must not claim a category basis");
  });

  test("G5: getSingleCandidate — polytechnic institution never category-matches a degree-only query", async () => {
    const poly = await prisma.indianInstitution.findFirst({ where: { institutionType: { contains: "polytechnic", mode: "insensitive" } } });
    assert.ok(poly, "a polytechnic institution must exist for the golden case");
    const c = await getSingleCandidate(poly.id, "indian", "B.TECH/B.E. Computer Science");
    assert.ok(c, "candidate should be returned with honest basis");
    assert.equal(c.mappingBasis, "none", `polytechnic + degree-only must be none, got ${c.mappingBasis}`);
    assert.ok(!c.program, "no verified program may be attached to the polytechnic");
  });

  test("G6: getSingleCandidate — (Diploma) institution never category-matches a degree-only query", async () => {
    const dip = await prisma.indianInstitution.findFirst({ where: { institutionType: { contains: "(diploma)", mode: "insensitive" } } });
    if (!dip) return; // dataset may have no such row — not a failure
    const c = await getSingleCandidate(dip.id, "indian", "B.TECH/B.E. Computer Science");
    assert.notEqual(c.mappingBasis, "institutionType-category", "(Diploma) institution cannot category-match a degree-only query");
  });

  test("G7: Diploma-context queries still map to polytechnic institutions (degree/diploma tracks stay disjoint)", async () => {
    const tokens = deriveInstitutionTypeTokens("Diploma in Computer Engineering");
    assert.deepEqual([...tokens].sort(), ["Polytechnic"]);
    const degTokens = deriveInstitutionTypeTokens("B.TECH Computer Science");
    assert.ok(!degTokens.some((t) => tokens.includes(t)), "degree and diploma category sets must stay disjoint");
  });

  test("G8: no verified Program row is attached to a diploma-level institution", async () => {
    const bad = await prisma.program.findFirst({
      where: {
        verificationStatus: "VERIFIED",
        indianInstitution: {
          OR: [
            { institutionType: { contains: "polytechnic", mode: "insensitive" } },
            { institutionType: { contains: "(diploma)", mode: "insensitive" } },
          ],
        },
      },
      include: { indianInstitution: { select: { name: true, institutionType: true } } },
    });
    assert.equal(bad, null, `verified program at diploma-level institution: ${bad?.indianInstitution?.name}`);
  });

  test("G9: core counts unchanged — University=20, IndianInstitution=73969, 0 UNVERIFIED programs", async () => {
    assert.equal(await prisma.university.count(), 20);
    assert.equal(await prisma.indianInstitution.count(), 73969);
    assert.equal(await prisma.program.count({ where: { verificationStatus: "UNVERIFIED" } }), 0);
  });

  test("G10: degree-only engineering discovery is deterministic (two runs identical)", async () => {
    const deg = await degreeByName("B.TECH/B.E. Computer Science");
    const a = await getInstitutionsForDegrees([deg.id], { limit: 50 });
    const b = await getInstitutionsForDegrees([deg.id], { limit: 50 });
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });
});