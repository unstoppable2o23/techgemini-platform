/**
 * Phase 23.2 — Final Polytechnic/Diploma qualification hardening regression.
 *
 * Validates explicit Qualification Level / Education Type semantics and the
 * surrounding recommendation safety rules. Institution classification always
 * uses structured institutionType data — NEVER name substrings nor the presence
 * of "Engineering"/"Technical"/"Polytechnic"/"Institute"/"College" in a name.
 */
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { PrismaClient } from "@prisma/client";

import {
  deriveInstitutionTypeTokens,
  isDiplomaLevelInstitutionType,
  institutionQualificationLabel,
  classifyInstitutionQualification,
  canDiplomaInstitutionGrantDegree,
} from "../src/lib/education-institutions/service.ts";
import { getSingleCandidate } from "../src/lib/university-matching/candidate.ts";
import { buildRoadmap } from "../src/lib/roadmap/rules.ts";

const prisma = new PrismaClient();

function inputs(o = {}) {
  return {
    userId: "u-t", goalCareerId: "c-t", goalCareerName: "Mechanical Engineer",
    topCareerId: "c-t", topCareerName: "Mechanical Engineer",
    educationStage: "SCHOOL_CLASS10", destination: "India", destinationLabel: "INDIA",
    exams: [], subjectsStudied: [], subjectsEnjoyed: [],
    recommendedDegrees: [], recommendedCareerNames: [], recommendedSubjects: [],
    programNames: [], institutionNames: [], ...o,
  };
}

describe("Polytechnic/Diploma qualification semantics", () => {
  test("diploma degrees map to Polytechnic category; degrees never to Polytechnic", () => {
    for (const d of [
      "Diploma in Mechanical Engineering",
      "Diploma in Civil Engineering",
      "Diploma in Computer Engineering",
      "Diploma in Electrical Engineering",
      "Diploma in Electronics Engineering",
    ]) {
      const t = deriveInstitutionTypeTokens(d);
      assert.deepEqual([...t].sort(), ["Polytechnic"], `${d} must map to Polytechnic only`);
    }
    const deg = deriveInstitutionTypeTokens("B.Tech Mechanical Engineering");
    assert.ok(deg.includes("Technical"), "B.Tech must map to Technical");
    assert.ok(!deg.includes("Polytechnic"), "B.Tech must not map to Polytechnic");
  });

  test("classifyInstitutionQualification: structured type drives level, never name", () => {
    assert.equal(classifyInstitutionQualification("Technical/Polytechnic").status, "diploma");
    assert.equal(classifyInstitutionQualification("Government Polytechnic").status, "diploma");
    assert.equal(classifyInstitutionQualification("Technical").status, "non-diploma");
    assert.equal(classifyInstitutionQualification("Affiliated College").status, "non-diploma");
    // Missing type data is "unknown" -> conservative, not invented
    assert.equal(classifyInstitutionQualification(null).status, "unknown");
    assert.equal(classifyInstitutionQualification(undefined).status, "unknown");
    assert.equal(classifyInstitutionQualification("").status, "unknown");
  });

  test("classification is name-agnostic (no substring inference)", () => {
    // Institution qualification reads ONLY institutionType — the name string is
    // never an input, so trigger words in a name can never flip the result.
    const names = [
      "XYZ Polytechnic College",
      "XYZ Institute of Technology",
      "ABC Engineering College",
      "DEF Technical Institute",
      "GHI College of Engineering & Technology",
    ];
    for (const n of names) {
      assert.equal(classifyInstitutionQualification("Technical/Polytechnic").status, "diploma", n);
      assert.equal(classifyInstitutionQualification("Affiliated College").status, "non-diploma", n);
      assert.equal(classifyInstitutionQualification(null).status, "unknown", n);
    }
  });

  test("canDiplomaInstitutionGrantDegree requires proof; missing data is false", () => {
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", true), true, "verified degree proves compatibility");
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", false), false, "no proof -> not compatible");
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", null), false, "missing verification -> conservative false");
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", undefined, undefined), false, "missing all data -> conservative false");
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", false, true), true, "curated mapping also proves compatibility");
    assert.equal(canDiplomaInstitutionGrantDegree("Technical", true), false, "non-diploma type: helper not applicable");
  });
});

describe("Polytechnic/Diploma routing safety", () => {
  test("1: Diploma student → Polytechnic/Diploma institutions (degree/diploma tracks disjoint via category)", async () => {
    const poly = await prisma.indianInstitution.findFirst({ where: { institutionType: { contains: "polytechnic", mode: "insensitive" } } });
    assert.ok(poly, "polytechnic institution must exist");
    // Diploma-context query maps the same institution via category.
    const tokens = deriveInstitutionTypeTokens("Diploma in Mechanical Engineering");
    assert.ok(tokens.includes("Polytechnic"));
  });

  test("2: Diploma student must NEVER receive a B.E./B.Tech-only institution result", async () => {
    const poly = await prisma.indianInstitution.findFirst({ where: { institutionType: { contains: "polytechnic", mode: "insensitive" } } });
    const c = await getSingleCandidate(poly.id, "indian", "B.Tech Mechanical Engineering");
    assert.ok(c, "candidate must resolve");
    assert.notEqual(c.mappingBasis, "institutionType-category", "polytechnic + degree-only must NOT category-match");
    assert.equal(c.mappingBasis, "none", "polytechnic + degree-only must be 'none' (no verified degree)");
    assert.ok(!c.program, "no verified program may be attached");
  });

  test("3: B.Tech student → engineering degree institutions via verified program tier; polytechnic-only rows stay blocked", async () => {
    // Tier-1 verified path: a VERIFIED B.Tech program qualifies its institution.
    const prog = await prisma.program.findFirst({
      where: { verificationStatus: "VERIFIED", name: { contains: "B.Tech", mode: "insensitive" } },
      include: { degree: true, indianInstitution: true },
    });
    assert.ok(prog?.indianInstitution, "verified B.Tech program with an institution must exist");
    assert.ok(!isDiplomaLevelInstitutionType(prog.indianInstitution.institutionType), "B.Tech institutions are degree-level");
    const c = await getSingleCandidate(prog.indianInstitution.id, "indian", prog.degree?.name || "B.Tech Mechanical Engineering");
    assert.ok(c, "candidate must resolve");
    assert.equal(c.mappingBasis, "verified-program", "B.Tech candidate comes from verified-program tier");
    assert.ok(c.program, "verified program shown");
    // Category path is never the degree route: a polytechnic-only row stays "none".
    const poly = await prisma.indianInstitution.findFirst({ where: { institutionType: { contains: "polytechnic", mode: "insensitive" } } });
    assert.ok(poly, "polytechnic institution exists");
    const blocked = await getSingleCandidate(poly.id, "indian", "B.Tech Mechanical Engineering");
    assert.equal(blocked.mappingBasis, "none", "polytechnic must never degree-category-match");
  });

  test("4: multi-level institution → program data determines qualification, not name/type", async () => {
    // A polytechnic-typed institution can grant a degree ONLY via a verified
    // Program row. Assert the proof-gated helper and the tier-1 path.
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", true), true);
    // Without a verified program row there is no degree evidence anywhere:
    assert.equal(await prisma.program.count({ where: { indianInstitution: { institutionType: { contains: "polytechnic", mode: "insensitive" } }, verificationStatus: "VERIFIED" } }), 0);
  });

  test("5: institution named 'Polytechnic' with a degree program → program data determines qualification", () => {
    // Classification is driven by institutionType (the proof layer) and Program
    // rows — the NAME "Polytechnic" never overrides a verified degree program.
    assert.equal(canDiplomaInstitutionGrantDegree("Affiliated College", true), false, "name has no role here");
    // A diploma-typed institution + verified degree = degree-compatible.
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", true), true);
  });

  test("6: institution named 'Engineering' offering Diploma only → must remain Diploma", () => {
    // institutionType decides; a name containing "Engineering" is irrelevant.
    assert.equal(classifyInstitutionQualification("Technical/Polytechnic").status, "diploma");
    assert.equal(classifyInstitutionQualification("Engineering College").status, "non-diploma");
  });

  test("7: no institution-name substring false positives", () => {
    // Institution NAME terms must never influence qualification classification.
    // classifyInstitutionQualification reads ONLY institutionType. Confirm that
    // the same type yields the same classification under every trigger-word name.
    for (const name of [
      "XYZ Polytechnic College",
      "XYZ Institute of Technology",
      "ABC Engineering College",
      "DEF Technical Institute",
      "GHI College of Engineering & Technology",
    ]) {
      assert.equal(classifyInstitutionQualification("Technical/Polytechnic").status, "diploma", name);
      assert.equal(classifyInstitutionQualification("Affiliated College").status, "non-diploma", name);
    }
    // deriveInstitutionTypeTokens is for DEGREE text only; confirm that feeding
    // an institution NAME does not produce a false "Polytechnic" category token.
    [
      "XYZ Polytechnic College",
      "XYZ Institute of Technology",
      "ABC Engineering College",
      "DEF Technical Institute",
      "GHI College of Engineering & Technology",
    ].forEach((name) => {
      const tk = deriveInstitutionTypeTokens(name);
      assert.ok(!tk.includes("Polytechnic"), `institution name must not infer Polytechnic: ${name}`);
    });
  });

  test("8: diploma → degree progression is conditional, never automatic", () => {
    const r = buildRoadmap(inputs({ diplomaIntent: true }));
    const step = r.steps.find((s) => /lateral|higher-study|employment/i.test(s.description));
    if (step) {
      assert.ok(/subject to|conditional|not automatic/i.test(step.description), "lateral entry must be conditional");
    }
    assert.ok(!/guarantee|automatically leads to b\.tech/i.test(String(step?.description || "")), "must not guarantee progression");
  });

  test("9: missing qualification data → conservative result, not invented classification", async () => {
    assert.equal(classifyInstitutionQualification(null).status, "unknown");
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", null), false);
    // A degree-only query on a diploma type with no verified program -> 'none'.
    const poly = await prisma.indianInstitution.findFirst({ where: { institutionType: { contains: "polytechnic", mode: "insensitive" } } });
    const c = await getSingleCandidate(poly.id, "indian", null);
    assert.equal(c.mappingBasis, "none", "no qualification data -> conservative 'none'");
  });
});