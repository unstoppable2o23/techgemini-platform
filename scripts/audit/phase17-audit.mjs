// Phase 17 — Career → Program intelligence v1 audit.
// Read-only against the DB. Emits scripts/audit/phase17-career-program-audit.json
// used by the markdown report documents.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), "scripts", "audit", "phase17-career-program-audit.json");

const REL_ORDER = ["PRIMARY", "COMMON", "SPECIALIZED", "RELEVANT", "OPTIONAL"];

async function main() {
  const base = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "scripts", "audit", "phase17-db-baseline.json"), "utf8")
  );

  const [programs, mappings, activeCareers, universityCount, indianCount, programTableCount] =
    await Promise.all([
      prisma.academicProgram.findMany({ orderBy: { slug: "asc" } }),
      prisma.careerProgramMapping.findMany({
        include: { career: { select: { name: true, category: true } }, program: { select: { slug: true, level: true } } },
      }),
      prisma.career.findMany({ where: { isActive: true }, select: { id: true, name: true, category: true, careerProgramMappings: { select: { id: true, isActive: true } } } }),
      prisma.university.count(),
      prisma.indianInstitution.count(),
      prisma.program.count(),
    ]);

  // programme catalogue quality
  const catalogue = {
    total: programs.length,
    active: programs.filter((p) => p.isActive).length,
    byLevel: {},
    byCategory: {},
    dupNames: 0,
    dupSlugs: 0,
  };
  const seenName = new Set();
  const seenSlug = new Set();
  for (const p of programs) {
    catalogue.byLevel[p.level] = (catalogue.byLevel[p.level] || 0) + 1;
    catalogue.byCategory[p.category] = (catalogue.byCategory[p.category] || 0) + 1;
  }
  for (const p of programs) {
    if (seenName.has(p.name.toLowerCase())) catalogue.dupNames++;
    if (seenSlug.has(p.slug)) catalogue.dupSlugs++;
    seenName.add(p.name.toLowerCase());
    seenSlug.add(p.slug);
  }
  for (const k of Object.keys(catalogue.byLevel)) catalogue.byLevel[k] = catalogue.byLevel[k];
  for (const k of Object.keys(catalogue.byCategory)) catalogue.byCategory[k] = catalogue.byCategory[k];

  // mappings coverage
  const byCareer = new Map();
  for (const m of mappings) {
    if (!byCareer.has(m.careerId)) byCareer.set(m.careerId, { name: m.career.name, category: m.career.category, rels: {} });
    const rec = byCareer.get(m.careerId);
    rec.rels[m.relationshipType] = (rec.rels[m.relationshipType] || 0) + 1;
  }
  const avgStrength = { PRIMARY: 0, COMMON: 0, SPECIALIZED: 0, RELEVANT: 0, OPTIONAL: 0 };
  const countByRel = { PRIMARY: 0, COMMON: 0, SPECIALIZED: 0, RELEVANT: 0, OPTIONAL: 0 };
  for (const m of mappings) {
    countByRel[m.relationshipType] = (countByRel[m.relationshipType] || 0) + 1;
    avgStrength[m.relationshipType] = (avgStrength[m.relationshipType] || 0) + m.strength;
  }
  for (const k of REL_ORDER) avgStrength[k] = (avgStrength[k] || 0) / (countByRel[k] || 1);

  const activeCareersMapped = activeCareers.filter((c) => c.careerProgramMappings.some((m) => m.isActive));
  const activeCareersUnmapped = activeCareers.filter((c) => !c.careerProgramMappings.some((m) => m.isActive));
  const noPrimary = activeCareers.filter((c) => {
    const r = byCareer.get(c.id);
    return !r || !r.rels.PRIMARY;
  });

  // per-family coverage
  const family = {};
  for (const c of activeCareers) {
    const rec = byCareer.get(c.id);
    const fam = c.category || "Unknown";
    family[fam] = family[fam] || { careers: 0, mapped: 0, mappings: 0, avgPerCareer: 0 };
    family[fam].careers++;
    if (rec) {
      family[fam].mapped++;
      family[fam].mappings += Object.values(rec.rels).reduce((a, b) => a + b, 0);
    }
  }
  const familySorted = Object.entries(family)
    .map(([name, v]) => ({ family: name, ...v, avg: +(v.mappings / v.careers).toFixed(2) }))
    .sort((a, b) => b.careers - a.careers);

  // sanitation / validation-derived metrics
  const distOfMappingPerCareer = Object.fromEntries(
    [...byCareer.values()].map((r) => [r.name, Object.values(r.rels).reduce((a, b) => a + b, 0)])
  );

  const totals = {
    academicProgramsBefore: 0,
    academicProgramsAfter: programs.length,
    careerProgramMappings: mappings.length,
    activeCareers: activeCareers.length,
    activeCareersMapped: activeCareersMapped.length,
    activeCareersUnmapped: activeCareersUnmapped.map((c) => c.name),
    noPrimaryCareers: noPrimary.map((c) => c.name),
    universityBefore: base?.counts?.University,
    universityAfter: universityCount,
    indianInstitutionBefore: base?.counts?.IndianInstitution,
    indianInstitutionAfter: indianCount,
    programTableBefore: base?.counts?.Program,
    programTableAfter: programTableCount,
    relationshipDistribution: countByRel,
    avgStrengthByRel: avgStrength,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        catalogue,
        totals,
        familyCoverage: familySorted,
        programsPerCareer: Object.fromEntries(
          [...byCareer.entries()].map(([id, r]) => [r.name, Object.values(r.rels).reduce((a, b) => a + b, 0)])
        ),
      },
      null,
      2
    )
  );

  console.log(`Wrote ${OUT}`);
  console.log(`Total AcademicProgram: ${programs.length}`);
  console.log(`Total mappings: ${mappings.length}`);
  console.log(`Active careers: ${activeCareers.length}, mapped: ${activeCareersMapped.length}`);
  console.log(`Relationship distribution: ${JSON.stringify(countByRel)}`);
  console.log(`DB safety: university ${universityCount} (baseline ${base?.counts?.University}), ` +
    `indianInstitution ${indianCount} (baseline ${base?.counts?.IndianInstitution}), ` +
    `Program table ${programTableCount} (baseline ${base?.counts?.Program})`);
  const fam = familySorted.slice(0, 5).map((f) => `${f.family}: ${f.careers} careers, ${f.mapped} mapped, ${f.mappings} mappings`).join("; ");
  console.log(`Top families: ${fam}`);
}

main().finally(() => prisma.$disconnect());