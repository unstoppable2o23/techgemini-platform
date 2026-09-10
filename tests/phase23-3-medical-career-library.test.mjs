/**
 * Phase 23.3 — Medical Career Library visibility.
 *
 * Regression suite for the Career Library search-visibility layer:
 *  - shared search matcher (client + API) surfaces canonical healthcare careers
 *    for the everyday terms students type (doctor -> Medicine, pharmacy ->
 *    Pharmacology, optometrist -> Optometry, and the broad "medical" query);
 *  - core medical careers exist, are active, carry content and their detail
 *    slugs resolve;
 *  - career->program mappings are correct AND non-inflated (Medicine -> MBBS;
 *    Pharmacy/Nursing/Physiotherapy/Optometry never MBBS);
 *  - polytechnic/diploma invariants from Phase 23.2 stay intact.
 *
 * The layer itself creates no careers — it fixes how catalogue careers are
 * found. The P3 production-acceptance pass extended the catalogue from 289 to
 * 293 active careers via an additive seed (Ayurveda, Homeopathy, Medical
 * Writing, Healthcare Management) with phase17-curated mappings; every other
 * engine/core-table baseline is asserted unchanged.
 */
import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { PrismaClient } from "@prisma/client";

import {
  normalizeCareerQuery,
  expandCareerSearchAliases,
  careerMatchesQuery,
  buildCareerSearchWhere,
  HEALTHCARE_CATEGORY,
} from "../src/lib/careers/search.ts";
import { getCareerPrograms } from "../src/lib/career-program.ts";
import {
  classifyInstitutionQualification,
  canDiplomaInstitutionGrantDegree,
} from "../src/lib/education-institutions/service.ts";

const prisma = new PrismaClient();

function fakeCareer({ slug = "medicine", name = "Medicine", ...rest } = {}) {
  return {
    slug,
    name,
    title: name,
    shortDescription: "A clinical healthcare career.",
    category: HEALTHCARE_CATEGORY,
    subcategory: "Entry-level Clinical",
    ...rest,
  };
}

const healthCareers = (...overrides) => [
  fakeCareer({ slug: "medicine", name: "Medicine", title: "Medicine" }),
  fakeCareer({ slug: "dentistry", name: "Dentistry", title: "Dentistry" }),
  fakeCareer({ slug: "pharmacology", name: "Pharmacology", title: "Pharmacology" }),
  fakeCareer({ slug: "nursing", name: "Nursing", title: "Nursing", subcategory: "General Nursing" }),
  fakeCareer({ slug: "optometry", name: "Optometry", title: "Optometry", subcategory: "Clinical Optometry" }),
  ...overrides,
];

describe("Career Library search layer (shared matcher)", () => {
  test("1: normalizeCareerQuery lowercases, trims and collapses whitespace", () => {
    assert.equal(normalizeCareerQuery("  Medical   IMAGING  "), "medical imaging");
    assert.equal(normalizeCareerQuery(""), "");
    assert.equal(normalizeCareerQuery("   "), "");
  });

  test("2: professional title maps to canonical slug (doctor -> Medicine/Surgeon)", () => {
    assert.deepEqual(expandCareerSearchAliases("doctor"), ["medicine", "surgeon"]);
    assert.equal(careerMatchesQuery(fakeCareer(), "doctor"), true);
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "pharmacology", name: "Pharmacology" }), "doctor"), false);
  });

  test("3: search prefixes resolve to the canonical careers (doctor/dentist/pharmacy)", () => {
    assert.equal(careerMatchesQuery(fakeCareer(), "DOCTOR"), true, "doctor -> Medicine");
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "dentistry", name: "Dentistry" }), "dentist"), true, "dentist -> Dentistry");
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "pharmacology", name: "Pharmacology" }), "pharmacy"), true, "pharmacy -> Pharmacology");
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "pharmacology", name: "Pharmacology" }), "pharmacist"), true, "pharmacist -> Pharmacology");
    assert.equal(careerMatchesQuery(fakeCareer(), "pharmacy"), false, "pharmacy must NOT hit Medicine");
  });

  test("4: practical-career terms resolve (physiotherapist/optometrist/nutritionist/vet)", () => {
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "physiotherapy", name: "Physiotherapy" }), "physiotherapist"), true);
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "optometry", name: "Optometry" }), "optometrist"), true);
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "nutrition-and-dietetics", name: "Nutrition and Dietetics" }), "nutritionist"), true);
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "veterinary-science", name: "Veterinary Science" }), "vet"), true);
  });

  test("5: broad 'medical' query matches every Healthcare & Medicine career", () => {
    for (const c of healthCareers()) {
      assert.equal(careerMatchesQuery(c, "medical"), true, `${c.slug} must match 'medical'`);
    }
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "software-engineering", name: "Software Engineering", category: "Technology" }), "medical"), false, "non-healthcare career is excluded");
  });

  test("6: specific 'medicine' matches Medicine by name, not the whole healthcare bucket", () => {
    assert.equal(careerMatchesQuery(fakeCareer(), "medicine"), true);
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "nursing", name: "Nursing" }), "medicine"), false, "'medicine' must not blanket-match Nursing");
  });

  test("7: matches are case-insensitive across name/title/shortDescription/category/subcategory/slug", () => {
    assert.equal(careerMatchesQuery(fakeCareer({ shortDescription: "Allied health diagnosis." }), "DIAGNOSIS"), true);
    assert.equal(careerMatchesQuery(fakeCareer({ subcategory: "Medical Imaging" }), "imaging"), true);
    assert.equal(careerMatchesQuery(fakeCareer({ slug: "medical-imaging" }), "imaging"), true);
  });

  test("8: buildCareerSearchWhere returns undefined for empty query, OR otherwise", () => {
    assert.equal(buildCareerSearchWhere(""), undefined);
    assert.equal(buildCareerSearchWhere("   "), undefined);
    const where = buildCareerSearchWhere("doctor");
    assert.ok(Array.isArray(where));
    assert.ok(where.some((w) => w.slug && w.slug.in && w.slug.in.includes("medicine")), "doctor alias expands to medicine slug");
  });

  test("9: buildCareerSearchWhere adds the healthcare category for broad terms", () => {
    const where = buildCareerSearchWhere("medical");
    assert.ok(where.some((w) => w.category === HEALTHCARE_CATEGORY), "broad term expands to whole category");
    const specific = buildCareerSearchWhere("medicine");
    assert.ok(!specific.some((w) => w.category === HEALTHCARE_CATEGORY), "specific term must not expand to the category");
  });
});

describe("Career Library data presence (DB)", () => {
  const coreSlugs = [
    "medicine", "surgeon", "dentistry", "pharmacology", "nursing", "physiotherapy",
    "occupational-therapy", "optometry", "medical-laboratory-sciences", "radiology-technology",
    "public-health", "biomedical-scientist", "biotechnology-research", "clinical-research",
    "hospital-administration", "paramedic", "nutrition-and-dietetics", "audiology",
    "genetic-counseling", "veterinary-science",
  ];
  // Biomedical/Biotech careers are curated under Life Sciences (deliberate); the
  // rest of the core medical set must be under Healthcare & Medicine.
  const lifeSciencesCore = ["biomedical-scientist", "biotechnology-research"];
  const healthcareCore = coreSlugs.filter((s) => !lifeSciencesCore.includes(s));

  test("10: 20 core entry-level medical careers exist, are active and visible", async () => {
    const rows = await prisma.career.findMany({
      where: { slug: { in: coreSlugs }, isActive: true },
      select: { slug: true, category: true, title: true, shortDescription: true },
    });
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    for (const slug of coreSlugs) {
      const row = bySlug.get(slug);
      assert.ok(row, `${slug} must exist and be active`);
      assert.ok(row.title, `${slug} must have a title`);
      assert.ok(row.shortDescription, `${slug} must have a short description`);
    }
  });

  test("11: healthcare core careers all sit in the Healthcare & Medicine category", async () => {
    const healthcare = await prisma.career.findMany({
      where: { slug: { in: healthcareCore }, isActive: true }, select: { slug: true, category: true },
    });
    const nonHeath = healthcare.filter((c) => c.category !== HEALTHCARE_CATEGORY).map((c) => c.slug);
    assert.deepEqual(nonHeath, [], "every core medical career must be categorised under Healthcare & Medicine");
    const lifeSciences = await prisma.career.findMany({
      where: { slug: { in: lifeSciencesCore }, isActive: true }, select: { slug: true, category: true },
    });
    for (const c of lifeSciences) assert.equal(c.category, "Life Sciences", `${c.slug} is deliberately a Life Sciences career`);
  });

  test("12: detail-page slugs resolve for every core career (direct URL route works)", async () => {
    for (const slug of coreSlugs) {
      const career = await prisma.career.findUnique({ where: { slug }, select: { id: true } });
      assert.ok(career, `career detail slug must resolve: ${slug}`);
    }
  });

  test("13: API where-builder returns Medicine for 'doctor', whole bucket for 'medical'", async () => {
    const doctorWhere = { isActive: true, OR: buildCareerSearchWhere("doctor") };
    const doctors = await prisma.career.findMany({ where: doctorWhere, select: { slug: true } });
    assert.ok(doctors.some((c) => c.slug === "medicine"), "'doctor' must surface Medicine");

    const medicalWhere = { isActive: true, OR: buildCareerSearchWhere("medical") };
    const medical = await prisma.career.findMany({ where: medicalWhere, select: { slug: true } });
    for (const slug of healthcareCore) {
      assert.ok(medical.some((c) => c.slug === slug), `'medical' must surface ${slug}`);
    }
    // "medical" also surfaces Biomedical Scientist via its name; "biotechnology"
    // is the curated term for Biotechnology Research (Life Sciences).
    const bioWhere = { isActive: true, OR: buildCareerSearchWhere("biotechnology") };
    const bio = await prisma.career.findMany({ where: bioWhere, select: { slug: true } });
    assert.ok(bio.some((c) => c.slug === "biotechnology-research"), "'biotechnology' must surface Biotechnology Research");
  });
});

describe("Career -> program mappings", () => {
  test("14: Medicine maps to MBBS as its PRIMARY program", async () => {
    const career = await prisma.career.findUnique({ where: { slug: "medicine" }, select: { id: true } });
    assert.ok(career);
    const progs = await getCareerPrograms(career.id);
    assert.ok(progs?.length, "Medicine must have mapped programs");
    const mbbs = progs.find((p) => /mbbs/i.test(p.programName));
    assert.ok(mbbs, "Medicine must map to MBBS");
    assert.equal(mbbs.relationshipType, "PRIMARY", "MBBS must be the PRIMARY entry program");
  });

  test("15: Dentistry maps to BDS and never MBBS", async () => {
    const career = await prisma.career.findUnique({ where: { slug: "dentistry" }, select: { id: true } });
    assert.ok(career);
    const progs = await getCareerPrograms(career.id);
    assert.ok(progs?.some((p) => /bds/i.test(p.programName) && p.relationshipType === "PRIMARY"), "Dentistry PRIMARY must be BDS");
    assert.equal(progs.filter((p) => /mbbs/i.test(p.programName)).length, 0, "Dentistry must not map to MBBS");
  });

  test("16: pharmacy/nursing/physiotherapy entry careers never map to MBBS", async () => {
    for (const slug of ["pharmacology", "nursing", "physiotherapy"]) {
      const career = await prisma.career.findUnique({ where: { slug }, select: { id: true } });
      assert.ok(career, `${slug} must exist`);
      const progs = await getCareerPrograms(career.id);
      assert.ok(progs?.length, `${slug} must have programs`);
      assert.equal(progs.filter((p) => /mbbs/i.test(p.programName)).length, 0, `${slug} must NEVER map to MBBS`);
    }
    const pharm = await prisma.career.findUnique({ where: { slug: "pharmacology" }, select: { id: true } });
    const pharmProgs = await getCareerPrograms(pharm.id);
    assert.ok(pharmProgs.some((p) => /b\.?pharm/i.test(p.programName)), "Pharmacology must map to B.Pharm");
  });

  test("17: allied-health and biomedical careers map to their own primary programs (no MBBS)", async () => {
    const expectedPrimary = [
      ["optometry", /optometry/i],
      ["medical-laboratory-sciences", /medical laboratory technology/i],
      ["radiology-technology", /medical imaging technology/i],
      ["public-health", /public health/i],
      ["biomedical-scientist", /biomedical engineering/i],
      ["biotechnology-research", /biotechnology engineering/i],
      ["clinical-research", /clinical research/i],
    ];
    for (const [slug, re] of expectedPrimary) {
      const career = await prisma.career.findUnique({ where: { slug }, select: { id: true } });
      assert.ok(career, `${slug} must exist`);
      const progs = await getCareerPrograms(career.id);
      assert.ok(progs?.some((p) => p.relationshipType === "PRIMARY" && re.test(p.programName)), `${slug} PRIMARY must match ${re}`);
      assert.equal(progs.filter((p) => /mbbs/i.test(p.programName)).length, 0, `${slug} must not map to MBBS`);
    }
  });

  test("18: catalogue count matches the P3 baseline of 293 active careers", async () => {
    const count = await prisma.career.count({ where: { isActive: true } });
    assert.equal(count, 293, "career catalogue must stay at the P3 medical-coverage baseline");
  });
});

describe("Polytechnic/diploma regression (Phase 23.2 invariants)", () => {
  test("19: diploma qualification semantics and degree-proof gate are unchanged", () => {
    assert.equal(classifyInstitutionQualification("Technical/Polytechnic").status, "diploma");
    assert.equal(classifyInstitutionQualification(null).status, "unknown");
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", true), true);
    assert.equal(canDiplomaInstitutionGrantDegree("Technical/Polytechnic", null), false);
  });
});