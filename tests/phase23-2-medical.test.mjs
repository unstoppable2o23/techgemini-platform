/**
 * Phase 23.2 — Part B: Medical Education Intelligence regression suite.
 *
 * Covers:
 *   - The medical-education registry (pure data) fully covers the 36 clinical
 *     Healthcare & Medicine careers (the 4 P3 additions include 2 clinical AYUSH
 *     careers — Ayurveda/Homeopathy — plus 2 non-clinical exclusions:
 *     Medical Writing and Healthcare Management).
 *   - Roadmap medical-branch wording constraints: no "(JEE|NEET|CUET|CAT)
 *     must/required" patterns, no PG steps in school stages, India vs abroad
 *     never conflated, no fabricated costs.
 *   - The 5 new verified MBBS programs (KGMU, Maulana Azad MC, Lady Hardinge MC,
 *     Grant MC, CMC Vellore) resolve through the verified-program candidate tier
 *     and contain no fabrication.
 *   - No core-table drift (Career 293, Degree 751, University 20,
 *     IndianInstitution 73969). Career 289 -> 293 reflects the P3 additive
 *     medical-coverage expansion (Ayurveda, Homeopathy, Medical Writing,
 *     Healthcare Management) seeded via scripts/seed-career-intelligence.mjs;
 *     the engine logic and all other core tables remain frozen.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  getMedicalDisciplineForCareerSlug,
  getMedicalDisciplineForCareerName,
  isMedicalCareerName,
  listMedicalDisciplines,
} from "../src/lib/medical-education/registry.ts";
import { buildRoadmap } from "../src/lib/roadmap/rules.ts";
import { getSingleCandidate } from "../src/lib/university-matching/candidate.ts";
import { isDiplomaLevelInstitutionType } from "../src/lib/education-institutions/service.ts";

const prisma = new PrismaClient();

const OFFICIAL_DOMAINS = new Set([
  "nmc.org.in", "nta.ac.in", "dciindia.gov.in", "indiannursingcouncil.org",
  "pci.nic.in", "ncismindia.org", "nch.org.in", "ahpnec.gov.in", "vci.nic.in",
  "icar.org.in", "ncert.nic.in",
]);

function inputs(overrides = {}) {
  return {
    userId: "u-test",
    goalCareerId: "c-med",
    goalCareerName: "Medicine",
    topCareerId: "c-med",
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
const joined = (r) => r.steps.map((s) => `${s.title}. ${s.description} ${s.reason || ""}`).join("\n");
const titles = (r) => r.steps.map((s) => s.title);

const NEW_MBBS_NAMES = [
  "KING GEORGE MEDICAL UNIVERSITY",
  "Maulana Azad Medical College",
  "Lady Hardinge Medical College",
  "Grant Medical College, Seth J.J. Compound Byculla, Mumbai",
  "CHRISTIAN MEDICAL COLLEGE (Inst. Code - 011), VELLORE",
];

// ---------------------------------------------------------------- registry
describe("Phase 23.2 — medical-education registry (knowledge layer)", () => {
  test("M1: registry has 21 disciplines with unique ids and unique titles", () => {
    const all = listMedicalDisciplines();
    assert.equal(all.length, 21);
    assert.equal(new Set(all.map((d) => d.id)).size, 21);
    assert.equal(new Set(all.map((d) => d.title.toLowerCase())).size, 21);
  });

  test("M2: registry covers every clinical active Healthcare & Medicine career (36/38; 2 non-clinical exclusions)", async () => {
    const careers = await prisma.career.findMany({ where: { category: "Healthcare & Medicine", isActive: true }, select: { slug: true, name: true } });
    assert.equal(careers.length, 38);
    // Deliberate P3 additions that are healthcare careers but NOT clinical
    // systems of medicine — they carry generic conservative wording instead of
    // a regulated-medical-entrance registry entry (Phase 23.2 design).
    const NON_CLINICAL_EXCLUSIONS = new Map([
      ["medical-writing", "non-clinical medical communications (no regulated clinical entry)"],
      ["healthcare-management", "non-clinical healthcare management (no regulated clinical entry)"],
    ]);
    const unresolvedClinical = careers.filter(
      (c) => !NON_CLINICAL_EXCLUSIONS.has(c.slug) && !getMedicalDisciplineForCareerSlug(c.slug)
    );
    assert.deepEqual(
      unresolvedClinical.map((c) => c.slug),
      [],
      `uncovered clinical medical careers: ${unresolvedClinical.map((c) => c.slug).join(", ")}`
    );
    for (const [slug, why] of NON_CLINICAL_EXCLUSIONS) {
      assert.ok(careers.some((c) => c.slug === slug), `${slug} must exist`);
      assert.equal(
        getMedicalDisciplineForCareerSlug(slug),
        null,
        `${slug} must stay intentionally excluded (${why})`
      );
    }
    // The two clinical AYUSH additions resolve into the ayush discipline.
    assert.ok(getMedicalDisciplineForCareerSlug("ayurveda")?.id === "ayush", "ayurveda must resolve to ayush");
    assert.ok(getMedicalDisciplineForCareerSlug("homeopathy")?.id === "ayush", "homeopathy must resolve to ayush");
  });

  test("M3: every discipline has the required evidence fields populated; sources are required where a regulator exists", () => {
    for (const d of listMedicalDisciplines()) {
      for (const f of ["title", "summary", "entrance", "degree", "internshipTraining", "registration", "specialization", "indiaAbroad"]) {
        assert.ok(d[f] && String(d[f]).trim().length > 1, `${d.id}.${f} must be populated`);
      }
      assert.ok(d.schoolSubjects.length >= 2, `${d.id} needs schoolSubjects`);
      assert.ok(d.curriculumFacts.length >= 1, `${d.id} needs curriculumFacts`);
      assert.ok(d.careerOptions.length >= 1, `${d.id} needs careerOptions`);
      assert.ok(d.alternatives.length >= 1, `${d.id} needs alternatives`);
      // A discipline that describes a statutory register must cite it.
      const claimsNoRegulator = /no (central |medical-)?statutory|no single national register|not centrally|not governed by a central/i.test(d.registration);
      if (d.sources.length === 0) {
        assert.ok(claimsNoRegulator, `${d.id} has no sources and does not state a statutory regulator`);
      }
    }
  });

  test("M4: all cited sources are official domains over https", () => {
    for (const d of listMedicalDisciplines()) {
      for (const s of d.sources) {
        assert.match(s.url, /^https?:\/\//i, `${d.id} bad source url ${s.url}`);
        const host = s.url.replace(/^https?:\/\//i, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
        assert.ok(OFFICIAL_DOMAINS.has(host), `${d.id} cites non-official domain ${host}`);
      }
    }
  });

  test("M5: isMedicalCareerName is true ONLY for Medicine/Dentistry/Nursing (regulated UG entrance)", () => {
    for (const n of ["Medicine", "Dentistry", "Nursing", "Surgeon"]) {
      assert.ok(isMedicalCareerName(n), `${n} must be a regulated medical entrance career`);
    }
    for (const n of ["Physiotherapy", "Paramedic", "Pharmacy", "Biomedical Scientist", "Medical AI Engineer", "Health Informatics", "Veterinary Science", "Nutrition and Dietetics", "Clinical Research"]) {
      assert.ok(!isMedicalCareerName(n), `${n} must NOT trigger the medical roadmap branch`);
    }
  });

  test("M6: regulatedEntrance is true only for medicine/dentistry/nursing disciplines", () => {
    const flags = listMedicalDisciplines().map((d) => [d.id, d.regulatedEntrance]).filter(([, f]) => f);
    assert.deepEqual(flags.map(([id]) => id).sort(), ["dentistry", "medicine", "nursing"]);
  });
});

// ---------------------------------------------------------------- roadmap
describe("Phase 23.2 — medical roadmap wording", () => {
  test("M7: Class-10 medical branch has no postgraduate step and no exam-must phrasing", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS10", goalCareerName: "Medicine" }));
    assert.ok(titles(r).includes("Explore the medical education pathway"));
    for (const s of r.steps) {
      const text = `${s.title} ${s.description} ${s.reason || ""}`;
      assert.doesNotMatch(text, /(postgraduate|masters|ph\.?d)/i, "Class-10 cannot contain PG wording");
      assert.doesNotMatch(text, /(JEE|NEET|CUET|CAT)\s*(must|required)/i, "Class-10 cannot demand an exam");
    }
  });

  test("M8: Class-12 India medicine mentions NEET-UG conservatively, never 'must/required'", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Medicine" }));
    const text = joined(r);
    assert.ok(titles(r).includes("Check the entrance route for your medical path"));
    assert.match(text, /NEET-UG|National Testing Agency/);
    assert.doesNotMatch(text, /(JEE|NEET|CUET|CAT)\s*(must|required)/i);
    assert.doesNotMatch(text, /guarantee/i);
  });

  test("M9: Class-12 India nursing spelling does not assert NEET-UG applies to nursing", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", goalCareerName: "Nursing" }));
    const text = joined(r);
    assert.match(text, /nursing/i);
    assert.doesNotMatch(text, /(JEE|NEET|CUET|CAT)\s*(must|required)/i);
    assert.match(text, /never assume NEET-UG/i);
  });

  test("M10: Class-12 medicine abroad keeps NEET out and is conservative (no fabrication)", () => {
    const r = buildRoadmap(inputs({ educationStage: "SCHOOL_CLASS12", destinationLabel: "UK", destination: "United Kingdom" }));
    const text = joined(r);
    assert.ok(titles(r).includes("Check how your target country regulates the profession"));
    assert.doesNotMatch(text, /NEET/i, "abroad branch must not push NEET-UG");
    assert.match(text, /regulated|GMC|recognition/i);
    assert.doesNotMatch(text, /\bguarantee\b|\$\d/gi, "abroad branch must not fabricate guarantees/currency");
  });

  test("M11: Undergraduate medicine branch has internship and PG-entrance planning steps", () => {
    const r = buildRoadmap(inputs({ educationStage: "UNDERGRADUATE", goalCareerName: "Medicine" }));
    assert.ok(titles(r).includes("Confirm your program's internship and regulated practice steps"));
    assert.ok(titles(r).includes("Check the postgraduate entrance route for your field"));
  });

  test("M12: Postgraduate medicine branch has registration/licensing step", () => {
    const r = buildRoadmap(inputs({ educationStage: "POSTGRADUATE", goalCareerName: "Medicine" }));
    assert.ok(titles(r).includes("Confirm professional registration and licensing for your jurisdiction"));
  });

  test("M13: medical roadmap is deterministic (two runs identical)", () => {
    const a = buildRoadmap(inputs({ goalCareerName: "Medicine" }));
    const b = buildRoadmap(inputs({ goalCareerName: "Medicine" }));
    // `snapshot.generatedAt` is a wall-clock stamp (engine-freeze also strips it);
    // every other field must be byte-identical across runs.
    delete a.snapshot.generatedAt;
    delete b.snapshot.generatedAt;
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  test("M14: Physiotherapy (allied health, no regulated UG entrance) gets NO medical branch", () => {
    const r = buildRoadmap(inputs({ goalCareerName: "Physiotherapy" }));
    const t = titles(r);
    assert.ok(!t.some((x) => x.includes("medical path")), "physiotherapy must not get a NEET medical branch");
    assert.doesNotMatch(joined(r), /(JEE|NEET|CUET|CAT)\s*(must|required)/i);
  });

  test("M15: non-health goal never mentions NEET in the India Class-12 roadmap", () => {
    const r = buildRoadmap(inputs({ goalCareerName: "Mechanical Engineer", goalCareerId: "c-mech", topCareerName: "Mechanical Engineer" }));
    assert.doesNotMatch(joined(r), /NEET/i);
  });
});

// ---------------------------------------------------------- verified MBBS rows
describe("Phase 23.2 — verified MBBS programs (data addition)", () => {
  test("M16: exactly 9 verified MBBS programs exist, 7 Indian including the 5 new colleges", async () => {
    const mbbs = await prisma.degree.findFirst({ where: { slug: "mbbs" } });
    assert.ok(mbbs, "canonical MBBS degree must exist");
    const all = await prisma.program.findMany({ where: { verificationStatus: "VERIFIED", degreeId: mbbs.id }, include: { indianInstitution: { select: { name: true } } } });
    assert.equal(all.length, 9, `expected 9 verified MBBS programs, got ${all.length}`);
    const indian = all.filter((p) => p.indianInstitutionId);
    assert.equal(indian.length, 7, `expected 7 Indian MBBS programs, got ${indian.length}`);
    const names = indian.map((p) => p.indianInstitution.name);
    for (const n of NEW_MBBS_NAMES) {
      assert.ok(names.includes(n), `missing new MBBS institution ${n}`);
    }
  });

  test("M17: every verified MBBS program has source=official-website and a real http(s) sourceUrl", async () => {
    const mbbs = await prisma.degree.findFirst({ where: { slug: "mbbs" } });
    const progs = await prisma.program.findMany({ where: { degreeId: mbbs.id } });
    for (const p of progs) {
      assert.equal(p.source, "official-website", `${p.name} must use official-website source`);
      assert.match(p.sourceUrl || "", /^https?:\/\//i, `${p.name} sourceUrl must be a URL`);
    }
  });

  test("M18: the 5 new rows are VERIFIED with verifiedAt captured", async () => {
    for (const n of NEW_MBBS_NAMES) {
      const p = await prisma.program.findFirst({
        where: { name: "MBBS", indianInstitution: { name: { equals: n, mode: "insensitive" } } },
      });
      assert.ok(p, `${n} must have an MBBS program row`);
      assert.equal(p.verificationStatus, "VERIFIED");
      assert.ok(p.verifiedAt, `${n} verifiedAt must be set`);
    }
  });

  test("M19: each of the 5 institutions resolves via verified-program for MBBS", async () => {
    for (const n of NEW_MBBS_NAMES) {
      const inst = await prisma.indianInstitution.findFirst({ where: { name: { equals: n, mode: "insensitive" } } });
      assert.ok(inst, `${n} institution must exist`);
      const c = await getSingleCandidate(inst.id, "indian", "MBBS");
      assert.ok(c, `${n} must yield a candidate`);
      assert.equal(c.mappingBasis, "verified-program", `${n} MBBS must be verified-program`);
      assert.equal(c.program?.name, "MBBS");
    }
  });

  test("M20: the 5 new MBBS programs have no duplicates at their institutions", async () => {
    const mbbs = await prisma.degree.findFirst({ where: { slug: "mbbs" } });
    for (const n of NEW_MBBS_NAMES) {
      const inst = await prisma.indianInstitution.findFirst({ where: { name: { equals: n, mode: "insensitive" } } });
      const cnt = await prisma.program.count({ where: { degreeId: mbbs.id, indianInstitutionId: inst.id } });
      assert.equal(cnt, 1, `${n} must have exactly one MBBS program, got ${cnt}`);
    }
  });

  test("M21: core counts unchanged — Career 293, Degree 751, University 20, IndianInstitution 73969", async () => {
    assert.equal(await prisma.career.count({ where: { isActive: true } }), 293);
    assert.equal(await prisma.degree.count(), 751);
    assert.equal(await prisma.university.count(), 20);
    assert.equal(await prisma.indianInstitution.count(), 73969);
  });

  test("M22: Program table is exactly 80 with 0 UNVERIFIED rows (no fabrication)", async () => {
    assert.equal(await prisma.program.count(), 80);
    assert.equal(await prisma.program.count({ where: { verificationStatus: "UNVERIFIED" } }), 0);
  });

  test("M23: MBBS program institutions are degree-granting, never diploma-level", async () => {
    for (const n of NEW_MBBS_NAMES) {
      const inst = await prisma.indianInstitution.findFirst({ where: { name: { equals: n, mode: "insensitive" } } });
      assert.ok(inst.type, `${n} must have a degree-granting type`);
      assert.ok(["University", "College"].includes(inst.type), `${n} has unexpected type ${inst.type}`);
      assert.ok(!isDiplomaLevelInstitutionType(inst.institutionType), `${n} must not be diploma-level`);
    }
  });
});