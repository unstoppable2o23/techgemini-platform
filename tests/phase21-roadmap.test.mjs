/**
 * Phase 21 — Roadmap rules + quality tests (pure, no DB required).
 *
 * Validates the roadmap generator against §31 quality rules:
 *   - education-stage correctness (no impossible sequencing)
 *   - India vs Abroad branches
 *   - country requirements are conservative (never fabricated)
 *   - conditional exams only when supported
 *   - honest explanations
 *   - deterministic ordering & dedupe
 *   - personalization using inputs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildRoadmap } from "../src/lib/roadmap/rules.ts";
import { detectEducationStage } from "../src/lib/roadmap/education-stage.ts";
import { resolveDestination, SUPPORTED_DESTINATIONS } from "../src/lib/roadmap/country-config.ts";
import { MILESTONE_ORDER } from "../src/lib/roadmap/types.ts";

function inputs(overrides = {}) {
  return {
    userId: "u-test",
    goalCareerId: "c-data",
    goalCareerName: "Data Science",
    topCareerId: "c-top",
    topCareerName: "Machine Learning Engineer",
    educationStage: "UNDERGRADUATE",
    destination: "US",
    destinationLabel: "USA",
    exams: [],
    subjectsStudied: ["Mathematics", "Computer Science"],
    subjectsEnjoyed: ["Mathematics"],
    recommendedDegrees: ["B.Tech", "BSc"],
    recommendedCareerNames: ["Data Science"],
    recommendedSubjects: ["Mathematics", "Computer Science"],
    programNames: ["B.Tech Computer Science"],
    institutionNames: ["MIT"],
    ...overrides,
  };
}

describe("education-stage detection", () => {
  test("detects Class 10", () => {
    assert.equal(detectEducationStage({ gradeLevel: "Class 10", studyLevel: null, highestEducation: null }), "SCHOOL_CLASS10");
    assert.equal(detectEducationStage({ gradeLevel: "10", studyLevel: null, highestEducation: null }), "SCHOOL_CLASS10");
  });
  test("detects Class 12", () => {
    assert.equal(detectEducationStage({ gradeLevel: "Class 12", studyLevel: null, highestEducation: null }), "SCHOOL_CLASS12");
  });
  test("detects undergraduate from studyLevel / highestEducation", () => {
    assert.equal(detectEducationStage({ gradeLevel: "UG", studyLevel: "undergraduate", highestEducation: null }), "UNDERGRADUATE");
    assert.equal(detectEducationStage({ gradeLevel: "UG", studyLevel: "bachelor", highestEducation: null }), "UNDERGRADUATE");
    assert.equal(detectEducationStage({ gradeLevel: "UG", studyLevel: null, highestEducation: "bachelor" }), "UNDERGRADUATE");
  });
  test("detects postgraduate", () => {
    assert.equal(detectEducationStage({ gradeLevel: "PG", studyLevel: "postgraduate", highestEducation: null }), "POSTGRADUATE");
    assert.equal(detectEducationStage({ gradeLevel: "UG", studyLevel: null, highestEducation: "master" }), "POSTGRADUATE");
  });
  test("falls back to UNKNOWN", () => {
    assert.equal(detectEducationStage({ gradeLevel: null, studyLevel: null, highestEducation: null }), "UNKNOWN");
  });
});

describe("country config", () => {
  test("supports required countries", () => {
    for (const c of ["INDIA", "USA", "UK", "CANADA", "AUSTRALIA", "GERMANY", "IRELAND", "NEW_ZEALAND"]) {
      assert.ok(SUPPORTED_DESTINATIONS.includes(c), `missing ${c}`);
    }
  });
  test("resolveDestination resolves common aliases", () => {
    assert.equal(resolveDestination("India"), "INDIA");
    assert.equal(resolveDestination("United States"), "USA");
    assert.equal(resolveDestination("UK"), "UK");
    assert.equal(resolveDestination("Canada"), "CANADA");
    assert.equal(resolveDestination("Australia"), "AUSTRALIA");
    assert.equal(resolveDestination("Germany"), "GERMANY");
    assert.equal(resolveDestination("New Zealand"), "NEW_ZEALAND");
    assert.equal(resolveDestination("Ireland"), "IRELAND");
  });
  test("unknown destination returns null (no fabrication)", () => {
    assert.equal(resolveDestination("Atlantis"), null);
  });
});

describe("roadmap generator — core", () => {
  test("generates steps + milestones deterministically", () => {
    const r1 = buildRoadmap(inputs());
    const r2 = buildRoadmap(inputs());
    assert.equal(r1.steps.length, r2.steps.length);
    assert.deepEqual(r1.steps.map((s) => s.title), r2.steps.map((s) => s.title));
    assert.ok(r1.steps.length >= 5);
    assert.equal(r1.milestones.length, MILESTONE_ORDER.length);
  });

  test("no duplicate step titles", () => {
    const r = buildRoadmap(inputs());
    const titles = r.steps.map((s) => s.title.toLowerCase());
    assert.equal(new Set(titles).size, titles.length);
  });

  test("personalizes using goal career (reason refers to goal)", () => {
    const r = buildRoadmap(inputs({ goalCareerName: "Data Science" }));
    const joined = r.steps.map((s) => s.description + " " + (s.reason || "")).join(" ");
    assert.match(joined.toLowerCase(), /data science/);
  });

  test("low-information / unknown stage produces honest minimal roadmap", () => {
    const r = buildRoadmap(inputs({ educationStage: "UNKNOWN", goalCareerName: null, topCareerName: null, destination: null, destinationLabel: null }));
    assert.equal(r.currentStage, undefined);
    assert.equal(r.progress, 0);
    assert.ok(r.steps.some((s) => /complete your profile/i.test(s.title)));
  });
});

describe("roadmap generator — India vs Abroad", () => {
  test("India path includes entrance-exam planning only (not guaranteed)", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", destinationLabel: "INDIA", destination: "India" }));
    const cat = r.steps.map((s) => s.category);
    assert.ok(cat.includes("ENTRANCE_EXAM"));
    // Must not assert a specific exam
    const joined = r.steps.map((s) => s.title + " " + s.description).join(" ");
    assert.doesNotMatch(joined, /(JEE|NEET|CUET|CAT)\s*(must|required)/i);
  });

  test("abroad path does not claim every country requires English test", () => {
    const r = buildRoadmap(inputs({ destinationLabel: "USA", destination: "US" }));
    const joined = r.steps.map((s) => s.title + " " + s.description).join(" ");
    // Should tell the student to CHECK, not assume
    assert.match(joined.toLowerCase(), /check|official|confirm/);
  });

  test("no fabricated deadlines or costs", () => {
    for (const dest of ["INDIA", "USA", "UK", "CANADA", "AUSTRALIA", "GERMANY", "IRELAND", "NEW_ZEALAND"]) {
      const r = buildRoadmap(inputs({ destinationLabel: dest, destination: dest === "INDIA" ? "India" : dest }));
      const joined = r.steps.map((s) => s.title + " " + s.description + " " + (s.reason || "")).join(" ");
      assert.doesNotMatch(joined, /\$\d|deadline/gi, `${dest} fabricated cost/deadline`);
      assert.doesNotMatch(joined, /\bguarantee\b/i, `${dest} contains guarantee`);
    }
  });

  test("no impossible education sequencing for Class 8/10 (no PG application as immediate step)", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS10", destinationLabel: null, destination: null }));
    for (const s of r.steps) {
      assert.doesNotMatch(s.description.toLowerCase(), /postgraduate|masters|ph\.?d/i, "school student cannot have PG step");
    }
  });

  test("Class 12 has application/shortlist focus", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12" }));
    const cats = r.steps.map((s) => s.category);
    assert.ok(cats.includes("UNIVERSITY_SHORTLIST"));
    assert.ok(cats.includes("APPLICATION"));
  });
});

describe("roadmap quality — conservation", () => {
  test("every step has title and explanatory description", () => {
    const r = buildRoadmap(inputs());
    for (const s of r.steps) {
      assert.ok(s.title && s.title.trim().length > 3, `missing title: ${JSON.stringify(s)}`);
      assert.ok(s.description && s.description.trim().length > 5, `missing description: ${s.title}`);
    }
  });

  test("no guaranteed admission/scholarship/visa/employment language", () => {
    const r = buildRoadmap(inputs());
    const joined = r.steps.map((s) => s.title + " " + s.description + " " + (s.reason || "")).join(" ");
    for (const bad of ["guaranteed admission", "guaranteed scholarship", "guaranteed visa", "guaranteed job", "100% placement", "sure admission"]) {
      assert.ok(!joined.toLowerCase().includes(bad), `found forbidden phrase: ${bad}`);
    }
  });

  test("no fabricated exam requirement without reliability", () => {
    const r = buildRoadmap(inputs({ destinationLabel: "USA", destination: "US" }));
    const joined = r.steps.map((s) => s.title + " " + s.description).join(" ");
    // English-test steps must be phrased as check/confirm, never definitive "you must take IELTS"
    assert.doesNotMatch(joined, /\b(iELTS|TOEFL|SAT|GRE)\s+(is|are)\s+(required|mandatory)\b/i);
  });

  test("destination-specific abroad requirements are conservative", () => {
    for (const dest of ["USA", "UK", "CANADA", "AUSTRALIA", "GERMANY", "IRELAND", "NEW_ZEALAND"]) {
      const r = buildRoadmap(inputs({ destinationLabel: dest, destination: dest }));
      const joined = r.steps.map((s) => s.title + " " + s.description).join(" ");
      assert.ok(/official|check|confirm/i.test(joined), `${dest} should reference official/check`);
    }
  });
});
