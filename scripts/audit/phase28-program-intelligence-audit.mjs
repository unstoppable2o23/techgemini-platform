// Phase 28 — Part 24: data-integrity audit probe (read-only).
// Captures the PROGRAM / UNIVERSITY intelligence baseline: counts, distincts,
// quality signals, duplicate/generic mapping heuristics. Writes a markdown
// summary to scripts/audit/phase28-program-intelligence-audit.md.
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";

const p = new PrismaClient();
const L = [];
const log = (s) => L.push(s);

async function main() {
  const totalAcademic = await p.academicProgram.count();
  const activeAcademic = await p.academicProgram.count({ where: { isActive: true } });
  log(`## AcademicProgram`);
  log(`- total=${totalAcademic} active=${activeAcademic}`);

  const levelAgg = await p.academicProgram.groupBy({ by: ["level"], _count: { _all: true } });
  log(`- level distincts:`);
  levelAgg.sort((a, b) => b._count._all - a._count._all).forEach((r) => log(`  - ${r.level || "(null)"}: ${r._count._all}`));

  const catAgg = await p.academicProgram.groupBy({ by: ["category"], _count: { _all: true } });
  log(`- category distincts (${catAgg.length}):`);
  catAgg.sort((a, b) => b._count._all - a._count._all).slice(0, 30).forEach((r) => log(`  - ${r.category || "(null)"}: ${r._count._all}`));

  const totalPrograms = await p.program.count();
  log(`\n## Program (institution-level)`);
  log(`- total=${totalPrograms}`);
  const verAgg = await p.program.groupBy({ by: ["verificationStatus"], _count: { _all: true } });
  verAgg.forEach((r) => log(`  - verificationStatus ${r.verificationStatus}: ${r._count._all}`));
  const modeAgg = await p.program.groupBy({ by: ["studyMode"], _count: { _all: true } });
  log(`- studyMode distincts:`);
  modeAgg.forEach((r) => log(`  - ${r.studyMode || "(null)"}: ${r._count._all}`));
  const progLevelAgg = await p.program.groupBy({ by: ["level"], _count: { _all: true } });
  log(`- level distincts:`);
  progLevelAgg.forEach((r) => log(`  - ${r.level || "(null)"}: ${r._count._all}`));
  log(`- with degreeId=${await p.program.count({ where: { degreeId: { not: null } } })}`);
  log(`- with specializationId=${await p.program.count({ where: { specializationId: { not: null } } })}`);
  log(`- linked to university=${await p.program.count({ where: { universityId: { not: null } } })}`);
  log(`- linked to indianInstitution=${await p.program.count({ where: { indianInstitutionId: { not: null } } })}`);
  const sourceAgg = await p.program.groupBy({ by: ["source"], _count: { _all: true } });
  log(`- source distincts:`);
  sourceAgg.forEach((r) => log(`  - ${r.source}: ${r._count._all}`));

  log(`\n## CareerProgramMapping`);
  const totalMappings = await p.careerProgramMapping.count();
  log(`- total=${totalMappings}`);
  const relAgg = await p.careerProgramMapping.groupBy({ by: ["relationshipType"], _count: { _all: true } });
  relAgg.forEach((r) => log(`  - ${r.relationshipType}: ${r._count._all}`));
  const mappedCareers = await p.careerProgramMapping.groupBy({ by: ["careerId"], _count: { _all: true } });
  log(`- careers with mappings=${mappedCareers.length}`);
  const progCounts = mappedCareers.map((r) => r._count._all);
  progCounts.sort((a, b) => a - b);
  log(`- programs/career min=${progCounts[0]} max=${progCounts[progCounts.length - 1]} median=${progCounts[Math.floor(progCounts.length / 2)]}`);

  const rawMappings = await p.careerProgramMapping.findMany({
    select: { careerId: true, program: { select: { id: true, name: true, level: true, category: true, slug: true } } },
  });
  const byProgram = new Map();
  for (const m of rawMappings) {
    if (!byProgram.has(m.program.id)) {
      byProgram.set(m.program.id, { name: m.program.name, level: m.program.level, careers: [] });
    }
    byProgram.get(m.program.id).careers.push(m.careerId);
  }
  const multiCareer = [...byProgram.entries()].filter(([, v]) => v.careers.length > 1);
  log(`- programs mapped to 2+ careers=${multiCareer.length} (${rawMappings.length - multiCareer.length} mapped to exactly 1)`);

  const broad = multiCareer
    .map(([id, v]) => ({ id, ...v }))
    .filter((v) => v.careers.length >= 5)
    .sort((a, b) => b.careers.length - a.careers.length)
    .slice(0, 20);
  log(`- candidate generic mappings (program linked to >=5 careers):`);
  for (const b of broad) log(`  - ${b.name} (${b.level}) -> ${b.careers.length} careers`);

  log(`\n## Medical program safety`);
  const medicalLike = await p.career.findMany({
    where: { OR: [{ name: { contains: "Medi", mode: "insensitive" } }, { name: { contains: "Doctor", mode: "insensitive" } }, { name: { contains: "Physician", mode: "insensitive" } }, { name: { contains: "Medicine", mode: "insensitive" } }] },
    select: { id: true, name: true },
  });
  log(`- careers matching medicine-ish names=${medicalLike.length}`);
  const mbbsPrograms = await p.academicProgram.findMany({
    where: { OR: [{ name: { contains: "MBBS", mode: "insensitive" } }, { name: { contains: "MBChB", mode: "insensitive" } }] },
    select: { id: true, name: true, slug: true },
  });
  log(`- MBBS-named programs=${mbbsPrograms.length}`);
  for (const m of mbbsPrograms) {
    log(`  - ${m.name}: mapped to ${await p.careerProgramMapping.count({ where: { programId: m.id } })} careers`);
  }
  const bds = await p.academicProgram.findMany({
    where: { OR: [{ name: { contains: "BDS", mode: "insensitive" } }, { name: { contains: "Dental", mode: "insensitive" } }] },
    select: { id: true, name: true },
  });
  log(`- BDS/Dental-named programs=${bds.length}`);
  for (const b of bds) log(`  - mapped to ${await p.careerProgramMapping.count({ where: { programId: b.id } })} careers`);
  const pharm = await p.academicProgram.findMany({ where: { name: { contains: "Pharmac", mode: "insensitive" } }, select: { id: true, name: true } });
  log(`- Pharmacy-named programs=${pharm.length}`);
  const nurse = await p.academicProgram.findMany({ where: { name: { contains: "Nurs", mode: "insensitive" } }, select: { id: true, name: true } });
  log(`- Nursing-named programs=${nurse.length}`);

  log(`\n## Diploma vs degree separation`);
  const diplomaPrograms = await p.academicProgram.findMany({
    where: { OR: [{ name: { contains: "Diploma", mode: "insensitive" } }, { name: { contains: "Polytechnic", mode: "insensitive" } }] },
    select: { id: true, name: true, level: true },
  });
  log(`- diploma/polytechnic programs=${diplomaPrograms.length}`);
  const btech = await p.academicProgram.findMany({
    where: { OR: [{ name: { contains: "B.E.", mode: "insensitive" } }, { name: { contains: "B.Tech", mode: "insensitive" } }] },
    select: { id: true, name: true, level: true },
  });
  log(`- BE/BTech programs=${btech.length}`);
  const diplomaIds = new Set(diplomaPrograms.map((d) => d.id));
  const overlapCareers = [];
  for (const m of rawMappings) {
    if (!diplomaIds.has(m.program.id)) continue;
    if (overlapCareers.includes(m.careerId)) continue;
    const hasBE = rawMappings.some((m2) => m2.careerId === m.careerId && btech.some((b) => b.id === m2.program.id));
    if (hasBE) overlapCareers.push(m.careerId);
  }
  log(`- careers that map BOTH diploma and BE/BTech programs=${overlapCareers.length}`);

  log(`\n## Degree / Specialization`);
  log(`- Degree rows=${await p.degree.count()} Specialization rows=${await p.specialization.count()}`);
  const degreeNames = await p.degree.findMany({ select: { name: true }, take: 60, orderBy: { name: "asc" } });
  log(`- degree sample:`);
  degreeNames.forEach((d) => log(`  - ${d.name}`));

  log(`\n## University`);
  log(`- University rows=${await p.university.count()}`);
  log(`- with linked programs=${(await p.program.groupBy({ by: ["universityId"], _count: { _all: true } })).length}`);

  log(`\n## IndianInstitution`);
  const instCount = await p.indianInstitution.count();
  log(`- rows=${instCount}`);
  const typeAgg = await p.indianInstitution.groupBy({ by: ["type"], _count: { _all: true } });
  log(`- type distincts (${typeAgg.length}):`);
  typeAgg.sort((a, b) => b._count._all - a._count._all).slice(0, 20).forEach((r) => log(`  - ${r.type}: ${r._count._all}`));
  const instTypeAgg = await p.indianInstitution.groupBy({ by: ["institutionType"], _count: { _all: true } });
  log(`- institutionType distincts (${instTypeAgg.length}):`);
  instTypeAgg.sort((a, b) => b._count._all - a._count._all).slice(0, 20).forEach((r) => log(`  - ${r.institutionType || "(null)"}: ${r._count._all}`));
  const stateAgg = await p.indianInstitution.groupBy({ by: ["state"], _count: { _all: true } });
  log(`- states distinct=${stateAgg.length}`);
  log(`- with website=${await p.indianInstitution.count({ where: { website: { not: null } } })}`);
  log(`- with district=${await p.indianInstitution.count({ where: { district: { not: null } } })}`);
  log(`- with linked programs=${(await p.program.groupBy({ by: ["indianInstitutionId"], _count: { _all: true } })).length}`);

  log(`\n## CareerEducationPathway`);
  const totalPathways = await p.careerEducationPathway.count();
  const pathTypeAgg = await p.careerEducationPathway.groupBy({ by: ["type"], _count: { _all: true } });
  log(`- total=${totalPathways}`);
  pathTypeAgg.forEach((r) => log(`  - type ${r.type}: ${r._count._all}`));
  log(`- with degree=${await p.careerEducationPathway.count({ where: { degreeId: { not: null } } })}`);
  log(`- with specialization=${await p.careerEducationPathway.count({ where: { specializationId: { not: null } } })}`);
  log(`- with subject=${await p.careerEducationPathway.count({ where: { subjectId: { not: null } } })}`);

  writeFileSync(
    fileURLToPath(new URL("./phase28-program-intelligence-audit.md", import.meta.url)),
    `# Phase 28 — Program & University Intelligence baseline (Part 24 probe)\n\nGenerated live at audit time.\n\n` + L.join("\n") + "\n",
    "utf8"
  );
  console.log("probe complete:");
  console.log(L.join("\n"));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());