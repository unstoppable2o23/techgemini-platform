/**
 * Phase 23.1 — Polytechnic / Diploma pathway correction regression suite.
 *
 * Validates that the Diploma/Polytechnic technical track is never conflated
 * with the B.E./B.Tech degree track, that Class-10 roadmaps present BOTH
 * post-Class-10 pathways as distinct neutral options, and that the catalog
 * holds no diploma→medicine/law or degree programs attached to polytechnic
 * institutions.
 *
 * Pure tests (no DB): institution-token separation + roadmap branching.
 * DB tests: golden-case E (no medicine/law diploma pathways) and F
 * (no Program rows at polytechnic institutions).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { buildRoadmap } from "../src/lib/roadmap/rules.ts";
import { detectDiplomaIntent } from "../src/lib/roadmap/education-stage.ts";
import { deriveInstitutionTypeTokens } from "../src/lib/education-institutions/service.ts";

const prisma = new PrismaClient();

function inputs(overrides = {}) {
  return {
    userId: "u-test",
    goalCareerId: "c-mech",
    goalCareerName: "Mechanical Engineer",
    topCareerId: "c-mech",
    topCareerName: "Mechanical Engineer",
    educationStage: "SCHOOL_CLASS10",
    destination: "INDIA",
    destinationLabel: "INDIA",
    exams: [],
    subjectsStudied: ["Mathematics", "Physics"],
    subjectsEnjoyed: ["Mathematics"],
    recommendedDegrees: ["B.Tech Mechanical"],
    recommendedCareerNames: ["Mechanical Engineer"],
    recommendedSubjects: ["Mathematics", "Physics"],
    programNames: ["B.Tech Mechanical Engineering"],
    institutionNames: [],
    ...overrides,
  };
}

const titles = (r) => r.steps.map((s) => s.title);
const joined = (r) => r.steps.map((s) => `${s.title}. ${s.description} ${s.reason || ""}`).join("\n");

describe("diploma vs degree institution-type separation", () => {
  test("B.Tech / B.E. degrees map to Technical only — never Polytechnic", () => {
    for (const name of ["B.TECH Computer Science", "BE Mechanical Engineering", "B.E. Civil Engineering", "M.Tech Electronics"]) {
      const tokens = deriveInstitutionTypeTokens(name);
      assert.ok(tokens.includes("Technical"), `${name} should map to Technical`);
      assert.ok(!tokens.includes("Polytechnic"), `${name} is a degree — it must not map to Polytechnic (got ${tokens.join(",")})`);
    }
  });

  test("Diploma degrees map to Polytechnic only — never Technical/University", () => {
    for (const name of [
      "Diploma in Mechanical Engineering",
      "Diploma in Civil Engineering",
      "Diploma in Electrical Engineering",
      "Diploma in Electronics Engineering",
      "Diploma in Computer Engineering",
    ]) {
      const tokens = deriveInstitutionTypeTokens(name);
      assert.deepEqual([...tokens].sort(), ["Polytechnic"], `${name} must map to Polytechnic ONLY (got ${tokens.join(",")})`);
    }
  });

  test("diploma and degree paths are disjoint", () => {
    const diploma = deriveInstitutionTypeTokens("Diploma in Computer Engineering");
    const degree = deriveInstitutionTypeTokens("B.Tech Computer Science");
    assert.ok(!diploma.some((t) => degree.includes(t)), "diploma and degree category sets must not overlap");
  });

  test("case/format canonicalization preserved under new exclusion", () => {
    const a = deriveInstitutionTypeTokens("Diploma in Computer Engineering");
    const b = deriveInstitutionTypeTokens("diploma in computer engineering");
    assert.deepEqual(a, b);
    assert.deepEqual(a, ["Polytechnic"]);
  });
});

describe("Class-10 roadmap — distinct academic vs diploma pathways", () => {
  test("academic branch presents BOTH post-Class-10 tracks neutrally", () => {
    const r = buildRoadmap(inputs({ diplomaIntent: false }));
    const step = r.steps.find((s) => s.title === "Choose your post–Class 10 pathway");
    assert.ok(step, "Class-10 roadmap must include the pathway-choice step");
    assert.match(step.description, /diploma/i);
    assert.match(step.description, /class 11/i);
    assert.doesNotMatch(step.description, /disadvantage|weaker|tier\s*2|poor/i, "wording must stay neutral");
  });

  test("academic branch keeps the Class 11–12 route and emits no diploma application steps", () => {
    const r = buildRoadmap(inputs({ diplomaIntent: false }));
    assert.ok(titles(r).includes("Choose Class 11–12 subjects to match your goal"));
    assert.ok(titles(r).includes("Keep your core subjects strong"));
    assert.ok(!titles(r).includes("Explore Diploma / Polytechnic options"));
    assert.ok(!titles(r).includes("Verify diploma eligibility and admission requirements"));
  });

  test("diploma branch emits the technical sequence and drops the Class 11–12 subject step", () => {
    const r = buildRoadmap(inputs({ diplomaIntent: true }));
    assert.ok(titles(r).includes("Explore Diploma / Polytechnic options"));
    assert.ok(titles(r).includes("Compare diploma branches"));
    assert.ok(titles(r).includes("Verify diploma eligibility and admission requirements"));
    assert.ok(titles(r).includes("Select an institution and programme for your diploma"));
    assert.ok(titles(r).includes("Complete your diploma"));
    assert.ok(!titles(r).includes("Choose Class 11–12 subjects to match your goal"));
  });

  test("diploma branch (India) mentions lateral entry as conditional, never automatic", () => {
    const r = buildRoadmap(inputs({ diplomaIntent: true, destination: "INDIA", destinationLabel: "INDIA" }));
    const lateral = r.steps.find((s) => s.title === "Explore employment or eligible higher-study options after your diploma");
    assert.ok(lateral, "India diploma roadmap must include a post-diploma step");
    assert.match(lateral.description, /lateral entry/i);
    assert.match(lateral.description, /subject to the applicable state and institution rules/i);
    assert.match(lateral.description, /not automatic/i);
    assert.doesNotMatch(lateral.description, /guaranteed|automatic admission/i);
  });

  test("diploma branch keeps the academic route available as an alternative", () => {
    const r = buildRoadmap(inputs({ diplomaIntent: true }));
    const alt = r.steps.find((s) => s.title === "Consider the Class 11–12 academic pathway as an alternative");
    assert.ok(alt, "diploma roadmap must still mention the academic alternative");
    assert.match(alt.description, /class 11/i);
    assert.match(alt.description, /alternative/i);
  });

  test("diploma student targeting abroad gets a qualification-acceptance check", () => {
    const r = buildRoadmap(inputs({ diplomaIntent: true, destination: "CANADA", destinationLabel: "CANADA" }));
    const step = r.steps.find((s) => s.title === "Confirm whether your diploma is accepted by your target institutions");
    assert.ok(step, "abroad diploma roadmap must verify recognition of the diploma");
    assert.match(step.description, /accepted/i);
  });

  test("no conservation regressions for any Class-10 branch", () => {
    for (const overrides of [
      { diplomaIntent: true, destination: "INDIA", destinationLabel: "INDIA" },
      { diplomaIntent: true, destination: "USA", destinationLabel: "USA" },
      { diplomaIntent: false, destination: "INDIA", destinationLabel: "INDIA" },
      { diplomaIntent: false, destination: "USA", destinationLabel: "USA" },
    ]) {
      const r = buildRoadmap(inputs(overrides));
      const text = joined(r).toLowerCase();
      assert.ok(r.steps.length >= 5, "expected a well-formed roadmap");
      assert.ok(!/(postgraduate|masters|ph\.?d)/i.test(text), `Class-10 roadmap cannot suggest PG study`);
      for (const bad of ["guaranteed admission", "guaranteed job", "guaranteed scholarship", "100% placement"]) {
        assert.ok(!text.includes(bad), `forbidden phrase ${bad} in class-10 roadmap`);
      }
    }
  });

  test("detectDiplomaIntent positively and negatively", () => {
    assert.equal(detectDiplomaIntent({ studyLevel: "Diploma", highestEducation: null, exams: [], preferredCareer: null }), true);
    assert.equal(detectDiplomaIntent({ studyLevel: "Class 10", highestEducation: null, exams: [], preferredCareer: "Polytechnic after 10th" }), true);
    assert.ok(!detectDiplomaIntent({ studyLevel: "Class 10", highestEducation: null, exams: [], preferredCareer: "Continue to Class 11–12" }));
  });
});

describe("golden cases: catalog holds no false diploma/degree links", () => {
  test("E: no Medicine/Law career (regulated profession) is linked to a diploma degree, while legit paramedical diplomas remain", async () => {
    const pathways = await prisma.careerEducationPathway.findMany({
      where: { degree: { name: { contains: "Diploma", mode: "insensitive" } } },
      include: { career: { select: { name: true } }, degree: { select: { name: true } } },
    });
    const regulated = pathways.filter((p) =>
      /doctor|physician|surgeon|mbbs|medicine\b|gynecolog|dermatolog|pediatric|cardiolog|neurolog|ophthalmolog|dentist|legal|advocate|lawyer|litigation|jurisprudence|\blaw\b(?!\s+enforcement)/i.test((p.career?.name || "").toLowerCase())
    );
    assert.equal(regulated.length, 0, `found diploma→regulated-profession pathways: ${regulated.map((p) => p.career?.name).join(", ")}`);
    const legitimate = pathways.filter((p) =>
      /paramedic|phlebotom|medical lab|paramedical|emergency medicine|ultrasound/i.test((p.career?.name || "").toLowerCase())
    );
    assert.ok(legitimate.every((p) => p.degreeId), "legit paramedical diploma links reference a canonical Degree record");
  });

  test("F: no Programme rows attached to polytechnic institutions (degree programs never shown there)", async () => {
    const polyInstitutions = await prisma.indianInstitution.findMany({
      where: { institutionType: { contains: "Polytechnic", mode: "insensitive" } },
      select: { id: true },
    });
    assert.ok(polyInstitutions.length > 0, "expected polytechnic institutions to exist in the dataset");
    const programRows = await prisma.program.count({
      where: { indianInstitution: { institutionType: { contains: "Polytechnic", mode: "insensitive" } } },
    });
    assert.equal(programRows, 0, "no degree programme rows may be attached to polytechnic institutions");
  });

  test("diploma-degree catalog contains no technical/engineering Diploma rows to mislabel", async () => {
    const diplomaDegrees = await prisma.degree.findMany({
      where: { name: { contains: "Diploma", mode: "insensitive" } },
      select: { name: true, educationLevel: true },
    });
    for (const d of diplomaDegrees) {
      assert.doesNotMatch(
        d.name,
        /mechanical|civil|electrical|electronics|computer engineering|production|tool|automobile/i,
        `unexpected technical Diploma row: ${d.name}`
      );
    }
  });
});

await prisma.$disconnect();