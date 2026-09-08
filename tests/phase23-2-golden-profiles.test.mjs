/**
 * Phase 23.2 — Golden profiles (Part F/E)
 *
 * Synthetic cases covering polytechnic + medical education pathways.
 * Each profile validates: roadmap presence/absence of specific steps,
 * candidate/classification honesty, and content wording.
 */
import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { buildRoadmap } from "../src/lib/roadmap/rules.ts";
import { getMedicalDisciplineForCareerName, isMedicalCareerName } from "../src/lib/medical-education/registry.ts";
import {
  isDiplomaLevelInstitutionType,
  institutionQualificationLabel,
} from "../src/lib/education-institutions/service.ts";

function inputs(overrides = {}) {
  return {
    userId: "u-golden",
    goalCareerId: "c-golden",
    goalCareerName: "Medicine",
    topCareerId: "c-golden",
    topCareerName: "Medicine",
    educationStage: "SCHOOL_CLASS12",
    destination: "India",
    destinationLabel: "INDIA",
    exams: [],
    subjectsStudied: ["Physics", "Chemistry", "Biology"],
    subjectsEnjoyed: ["Biology"],
    recommendedDegrees: ["MBBS"],
    recommendedCareerNames: ["Medicine"],
    recommendedSubjects: ["Physics", "Chemistry", "Biology"],
    programNames: ["MBBS"],
    institutionNames: [],
    ...overrides,
  };
}

function titles(r) { return r.steps.map((s) => s.title); }
function joined(r) { return r.steps.map((s) => `${s.title}. ${s.description} ${s.reason || ""}`).join("\n"); }

// ────────────────────────────────────────────────────────────────────────
// Polytechnic golden profiles
// ────────────────────────────────────────────────────────────────────────

describe("Golden polytechnic profiles", () => {
  test("A: Class 10 → Mechanical Diploma", () => {
    const r = buildRoadmap(inputs({
      educationStage: "SCHOOL_CLASS10",
      diplomaIntent: true,
      goalCareerName: "Mechanical Engineer",
      topCareerName: "Mechanical Engineer",
      destination: "INDIA",
      destinationLabel: "INDIA",
    }));
    const t = titles(r);
    assert.ok(t.some((s) => /diploma/i.test(s)), "diploma path must appear");
    assert.ok(t.some((s) => /branch|mechanical/i.test(s)), "should mention mechanical / branch comparison");
    assert.ok(t.some((s) => /lateral|employment|higher-study/i.test(s)), "should include post-diploma options");
    assert.ok(!t.some((s) => /b\.tech|b\.e\.|bachelor of engineering/i.test(s)), "must not present B.E./B.Tech as direct diploma outcome");
  });

  test("B: Class 10 → Computer Diploma", () => {
    const r = buildRoadmap(inputs({
      educationStage: "SCHOOL_CLASS10",
      diplomaIntent: true,
      goalCareerName: "Computer Science Engineer",
      topCareerName: "Computer Science Engineer",
      destination: "INDIA",
      destinationLabel: "INDIA",
    }));
    const t = titles(r);
    assert.ok(t.some((s) => /diploma/i.test(s)), "diploma path must appear");
    assert.ok(!t.some((s) => /b\.tech|b\.e\.|bachelor of engineering/i.test(s)), "no B.E./B.Tech in diploma roadmap");
  });

  test("C: Diploma holder → possible degree progression (conditional lateral entry)", () => {
    const r = buildRoadmap(inputs({
      educationStage: "SCHOOL_CLASS10",
      diplomaIntent: true,
      goalCareerName: "Mechanical Engineer",
      topCareerName: "Mechanical Engineer",
      destination: "INDIA",
      destinationLabel: "INDIA",
    }));
    const step = r.steps.find((s) => /lateral|higher-study|employment/i.test(s.description));
    if (step) {
      assert.ok(
        /conditional|subject to|not automatic/i.test(step.description),
        "lateral entry must be conditional, never guaranteed"
      );
    }
  });

  test("D: Class 10 → Class 11–12 academic pathway (no diploma)", () => {
    const r = buildRoadmap(inputs({
      educationStage: "SCHOOL_CLASS10",
      diplomaIntent: false,
      goalCareerName: "Mechanical Engineer",
      topCareerName: "Mechanical Engineer",
      destination: "INDIA",
      destinationLabel: "INDIA",
    }));
    const t = titles(r);
    assert.ok(t.some((s) => /class\s*11|12|subject/i.test(s)), "academic pathway must mention Class 11-12 / subjects");
    assert.ok(!t.some((s) => /explore diploma|compare diploma branch/i.test(s)), "academic path must not emit diploma exploration steps");
  });

  test("Honest labels: diploma institution ≠ degree", () => {
    assert.ok(isDiplomaLevelInstitutionType("Technical/Polytechnic"));
    assert.ok(isDiplomaLevelInstitutionType("Government Polytechnic"));
    assert.ok(!isDiplomaLevelInstitutionType("Technical"));
    assert.ok(!isDiplomaLevelInstitutionType("University"));
    assert.equal(institutionQualificationLabel("Technical/Polytechnic"), "Diploma / Polytechnic");
    assert.equal(institutionQualificationLabel(null), null);
  });
});

// ────────────────────────────────────────────────────────────────────────
// Medical golden profiles
// ────────────────────────────────────────────────────────────────────────

describe("Golden medical profiles", () => {
  test("E: Class 12 Biology → Medicine", () => {
    assert.ok(isMedicalCareerName("Medicine"));
    const d = getMedicalDisciplineForCareerName("Medicine");
    assert.equal(d.id, "medicine");
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Medicine", destination: "INDIA", destinationLabel: "INDIA" }));
    const j = joined(r);
    assert.ok(/neet/i.test(j), "India medicine must mention NEET-UG");
    assert.ok(/mbbs/i.test(j), "medicine must reference MBBS");
  });

  test("F: Class 12 Biology → Dentistry", () => {
    assert.ok(isMedicalCareerName("Dentistry"));
    const d = getMedicalDisciplineForCareerName("Dentistry");
    assert.equal(d.id, "dentistry");
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Dentistry", destination: "INDIA", destinationLabel: "INDIA" }));
    const j = joined(r);
    assert.ok(/neet/i.test(j), "India dentistry must mention NEET-UG");
    assert.ok(/bds/i.test(j), "dentistry must reference BDS");
  });

  test("G: Class 12 Biology → Pharmacy (via Pharmacology career)", () => {
    const d = getMedicalDisciplineForCareerName("Pharmacology");
    assert.ok(d, "Pharmacology must resolve a discipline");
    assert.equal(d.id, "pharmacy");
    assert.equal(isMedicalCareerName("Pharmacology"), false, "pharmacy is not a regulated medical-branch career");
  });

  test("H: Class 12 Biology → Nursing", () => {
    assert.ok(isMedicalCareerName("Nursing"));
    const d = getMedicalDisciplineForCareerName("Nursing");
    assert.equal(d.id, "nursing");
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Nursing", destination: "INDIA", destinationLabel: "INDIA" }));
    const t = titles(r);
    assert.ok(!t.some((s) => /neet.*must|must.*neet/i.test(s)), "nursing must not assert NEET as mandatory");
  });

  test("I: Biology + research interest → not automatically MBBS", () => {
    const d = getMedicalDisciplineForCareerName("Clinical Research");
    assert.ok(d, "Clinical Research resolves to a medical discipline");
    assert.ok(d.id !== "medicine", "clinical research must not be medicine");
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Clinical Research", destination: "INDIA", destinationLabel: "INDIA" }));
    const t = titles(r);
    assert.ok(!t.some((s) => /mbbs/i.test(s)), "clinical research roadmap must not mention MBBS");
  });

  test("J: Healthcare but non-clinical → not a medical-branch career", () => {
    assert.equal(isMedicalCareerName("Health Informatics"), false, "Health Informatics is not a medical-branch career");
    const d = getMedicalDisciplineForCareerName("Health Informatics");
    assert.equal(d?.id, "health-it-digital", "Health Informatics maps to health-it-digital discipline");
  });

  test("K: Medical student → PG specialization progression", () => {
    const r = buildRoadmap(inputs({ educationStage: "UNDERGRADUATE", goalCareerName: "Medicine", destination: "INDIA", destinationLabel: "INDIA" }));
    const t = titles(r);
    assert.ok(t.some((s) => /speciali[sz]ation|pg|postgraduate/i.test(s)), "UG medicine must mention PG or specialization");
  });

  test("L: Medicine → Abroad keeps NEET out", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Medicine", destination: "USA", destinationLabel: "USA" }));
    const t = titles(r);
    assert.ok(!t.some((s) => /neet/i.test(s)), "abroad medicine must not mention NEET-UG");
    assert.ok(t.some((s) => /country|regulator|licens|recogni/i.test(s)), "abroad must mention country/regulator/licensure");
  });

  test("Roadmap is deterministic (same input → identical output)", () => {
    const a = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Medicine" }));
    const b = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Medicine" }));
    // `snapshot.generatedAt` is a wall-clock stamp (engine-freeze also strips it).
    delete a.snapshot.generatedAt;
    delete b.snapshot.generatedAt;
    assert.deepEqual(a, b, "roadmap must be deterministic");
  });
});