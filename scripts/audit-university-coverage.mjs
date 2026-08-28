import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { getInstitutionsForCareer } from "../src/lib/education-institutions/service.ts";

const prisma = new PrismaClient();
const out = (s = "") => process.stdout.write(s + "\n");

async function main() {
  // ---- STEP 1/3: COUNTS ----
  const universityCount = await prisma.university.count();
  const indianCount = await prisma.indianInstitution.count();
  const mappingCount = await prisma.educationInstitutionMapping.count();
  const degreeCount = await prisma.degree.count();
  const specCount = await prisma.specialization.count();
  const pathwayCount = await prisma.careerEducationPathway.count();
  const careerCount = await prisma.career.count();

  out("=== STEP 3: CURRENT COUNTS ===");
  out(`University=${universityCount} IndianInstitution=${indianCount} EducationInstitutionMapping(program)=${mappingCount} Degree=${degreeCount} Specialization=${specCount} CareerEducationPathway=${pathwayCount} Career=${careerCount}`);

  // ---- STEP 4: University by country ----
  out("\n=== STEP 4: UNIVERSITY BY COUNTRY ===");
  if (universityCount > 0) {
    const byCountry = await prisma.university.groupBy({ by: ["country"], _count: { _all: true } });
    byCountry.sort((a, b) => b._count._all - a._count._all);
    byCountry.slice(0, 15).forEach((c) => out(`  ${c.country}: ${c._count._all}`));
  } else {
    out("  (No University rows in this database — global/international dataset not provisioned in local/seed env.)");
  }

  // ---- STEP 5/6: India coverage ----
  out("\n=== STEP 5: INDIAN INSTITUTION — TYPE & STATE ===");
  const byType = await prisma.indianInstitution.groupBy({ by: ["type"], _count: { _all: true } });
  byType.sort((a, b) => b._count._all - a._count._all);
  out("  Top institution types:");
  byType.slice(0, 20).forEach((t) => out(`    ${t.type}: ${t._count._all}`));
  const byState = await prisma.indianInstitution.groupBy({ by: ["state"], _count: { _all: true } });
  byState.sort((a, b) => b._count._all - a._count._all);
  out("  Top states:");
  byState.slice(0, 15).forEach((s) => out(`    ${s.state}: ${s._count._all}`));

  // High-value categories via name phrase (substring) match
  out("\n=== STEP 6: INDIA HIGH-VALUE CATEGORY PRESENCE ===");
  const kw = {
    IIT: "Indian Institute of Technology",
    IIM: "Indian Institute of Management",
    NIT: "National Institute of Technology",
    IIIT: "Indian Institute of Information Technology",
    AIIMS: "All India Institute of Medical Sciences",
    IISc: "Indian Institute of Science",
    IISER: "Indian Institute of Science Education and Research",
    "Central University": "Central University",
    "Deemed University": "Deemed",
    "Private University": "Private University",
    "State University": "State University",
    "National Law University": "National Law University",
    "NIFT": "National Institute of Fashion Technology",
    "IISER (alt)": "IISER",
  };
  for (const [k, phrase] of Object.entries(kw)) {
    const n = await prisma.indianInstitution.count({ where: { name: { contains: phrase, mode: "insensitive" } } });
    out(`    ${k} ("${phrase}"): ~${n} records`);
  }

  // ---- STEP 9: Identity quality (IndianInstitution) ----
  out("\n=== STEP 9: IDENTITY QUALITY (IndianInstitution) ===");
  const missWeb = await prisma.indianInstitution.count({ where: { website: null } });
  const missDistrict = await prisma.indianInstitution.count({ where: { district: null } });
  const missLoc = await prisma.indianInstitution.count({ where: { location: null } });
  const missInstType = await prisma.indianInstitution.count({ where: { institutionType: null } });
  const missMgmt = await prisma.indianInstitution.count({ where: { management: null } });
  const missUniName = await prisma.indianInstitution.count({ where: { universityName: null } });
  out(`  missing website=${missWeb} missing district=${missDistrict} missing location=${missLoc} missing institutionType=${missInstType} missing management=${missMgmt} missing universityName=${missUniName} (of ${indianCount}; state/type are required fields)`);

  // ---- STEP 8: Duplicate detection (exact name collisions) ----
  out("\n=== STEP 8: POTENTIAL DUPLICATES (exact name collisions) ===");
  const dupNames = await prisma.indianInstitution.groupBy({ by: ["name"], _count: { _all: true }, having: { name: { _count: { gt: 1 } } } });
  out(`  IndianInstitution exact-duplicate names: ${dupNames.length}`);
  dupNames.slice(0, 15).forEach((d) => out(`    "${d.name}" x${d._count._all}`));
  if (universityCount > 0) {
    const dupU = await prisma.university.groupBy({ by: ["name"], _count: { _all: true }, having: { name: { _count: { gt: 1 } } } });
    out(`  University exact-duplicate names: ${dupU.length}`);
  }

  // ---- STEP 11: Program mapping coverage ----
  out("\n=== STEP 11: PROGRAM MAPPING (EducationInstitutionMapping) ===");
  const mapByType = await prisma.educationInstitutionMapping.groupBy({ by: ["mappingType"], _count: { _all: true } });
  mapByType.forEach((m) => out(`    mappingType=${m.mappingType}: ${m._count._all}`));
  const withUni = await prisma.educationInstitutionMapping.count({ where: { universityId: { not: null } } });
  const withIndian = await prisma.educationInstitutionMapping.count({ where: { indianInstitutionId: { not: null } } });
  const withDegree = await prisma.educationInstitutionMapping.count({ where: { degreeId: { not: null } } });
  const withSpec = await prisma.educationInstitutionMapping.count({ where: { specializationId: { not: null } } });
  out(`  mappings with universityId=${withUni} indianInstitutionId=${withIndian} degreeId=${withDegree} specializationId=${withSpec}`);
  const verified = await prisma.educationInstitutionMapping.count({ where: { mappingType: "CURATED" } });
  const catDerived = await prisma.educationInstitutionMapping.count({ where: { mappingType: "CATEGORY_DERIVED" } });
  out(`  CURATED(verified-ish)=${verified} CATEGORY_DERIVED=${catDerived}`);

  // ---- STEP 12/25/26: 40 emerging careers → institution coverage ----
  out("\n=== STEP 12/25/26: 40 EMERGING CAREERS → INSTITUTION COVERAGE ===");
  const raw = JSON.parse(fs.readFileSync("scripts/career-intelligence/new-careers-emerging-v1.json", "utf8"));
  const names = raw.map((o) => o.name);
  let curatedCareer = 0, catOnly = 0, noneCareer = 0;
  for (const n of names) {
    const c = await prisma.career.findUnique({ where: { name: n }, select: { id: true } });
    if (!c) { noneCareer++; continue; }
    const res = await getInstitutionsForCareer(c.id, { limit: 5 });
    if (res.mappingBasis === "curated") curatedCareer++;
    else if (res.mappingBasis === "institutionType-category") catOnly++;
    else noneCareer++;
  }
  out(`  Careers with CURATED institution mapping: ${curatedCareer}`);
  out(`  Careers with CATEGORY-BASED only: ${catOnly}`);
  out(`  Careers with NO institution mapping: ${noneCareer}`);

  // ---- STEP 13: India program verification sample (CS/AI/cyber/robots/biotech) ----
  out("\n=== STEP 13/26: DEGREE PROGRAM VERIFICATION (sample degrees) ===");
  const sampleDegs = ["B.TECH Computer Science", "M.SC Data Science", "B.TECH Robotics", "M.SC Biotechnology", "B.TECH Cyber Security", "M.SC Artificial Intelligence", "B.TECH Renewable Energy"];
  for (const d of sampleDegs) {
    const deg = await prisma.degree.findFirst({ where: { name: d } });
    if (!deg) { out(`    ${d}: degree not found`); continue; }
    const mc = await prisma.educationInstitutionMapping.count({ where: { degreeId: deg.id } });
    out(`    ${d}: curated mappings=${mc}`);
  }

  // ---- STEP 32: chain test (read-only) ----
  out("\n=== STEP 32: CAREER→EDUCATION→UNIVERSITY CHAIN (representative) ===");
  for (const n of ["Computer Vision Engineer", "NLP Engineer", "IoT Security Engineer"]) {
    const c = await prisma.career.findUnique({ where: { name: n }, select: { id: true } });
    if (!c) { out(`    ${n}: not found`); continue; }
    const res = await getInstitutionsForCareer(c.id, { limit: 5 });
    out(`    ${n}: candidates=${res.total} basis=${res.mappingBasis} sample=${res.institutions.slice(0,3).map((i)=>i.name).join(", ")}`);
  }

  out("\n=== UNIVERSITY/INDIANINSTITUTION ROWS CHANGED THIS PHASE: 0 ===");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
