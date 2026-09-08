import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// Phase 23.2 — Verified MBBS programs at five well-established Indian medical colleges.
// Idempotent: skips when the same institution+degree+name already exists.
// Degree link: canonical "MBBS" degree row (slug mbbs). No specialization.
const PROGRAMS = [
  { institutionName: "KING GEORGE MEDICAL UNIVERSITY", programName: "MBBS", level: "Bachelor's", studyMode: "Full-time", duration: "5.5 years", source: "official-website", sourceUrl: "https://www.kgmu.org" },
  { institutionName: "Maulana Azad Medical College", programName: "MBBS", level: "Bachelor's", studyMode: "Full-time", duration: "5.5 years", source: "official-website", sourceUrl: "https://mamc.delhi.gov.in/" },
  { institutionName: "Lady Hardinge Medical College", programName: "MBBS", level: "Bachelor's", studyMode: "Full-time", duration: "5.5 years", source: "official-website", sourceUrl: "https://www.lhmc.nic.in" },
  { institutionName: "Grant Medical College, Seth J.J. Compound Byculla, Mumbai", programName: "MBBS", level: "Bachelor's", studyMode: "Full-time", duration: "5.5 years", source: "official-website", sourceUrl: "https://gmcjjh.edu.in" },
  { institutionName: "CHRISTIAN MEDICAL COLLEGE (Inst. Code - 011), VELLORE", programName: "MBBS", level: "Bachelor's", studyMode: "Full-time", duration: "5.5 years", source: "official-website", sourceUrl: "https://www.cmch-vellore.edu" },
];

async function main() {
  const mode = DRY_RUN ? "DRY-RUN" : "APPLY";
  console.log(`=== Phase 23.2 Verified MBBS Programs (${mode}) ===`);
  const before = await prisma.program.count();
  console.log(`Before: Program=${before}`);
  const degree = await prisma.degree.findFirst({ where: { slug: "mbbs" } });
  if (!degree) throw new Error("canonical MBBS degree row not found");
  let approved = 0, skippedDup = 0, rejected = 0;
  const toInsert = [];
  for (const p of PROGRAMS) {
    const inst = await prisma.indianInstitution.findFirst({ where: { name: { equals: p.institutionName, mode: "insensitive" } } });
    if (!inst) { console.log(`REJECT (institution not found): ${p.institutionName}`); rejected++; continue; }
    const dup = await prisma.program.findFirst({
      where: { name: p.programName, degreeId: degree.id, specializationId: null, indianInstitutionId: inst.id },
    });
    if (dup) { console.log(`SKIP (duplicate): ${p.institutionName} -> ${p.programName} (${dup.id})`); skippedDup++; continue; }
    console.log(`APPROVED: ${inst.name} (${inst.id}) -> MBBS`);
    approved++;
    toInsert.push({ p, inst });
  }
  console.log(`\nSummary (${mode}): approved=${approved} skippedDup=${skippedDup} rejected=${rejected} total=${PROGRAMS.length}`);
  if (DRY_RUN) { console.log("Dry-run complete — no records written."); await prisma.$disconnect(); return; }
  let inserted = 0;
  for (const { p, inst } of toInsert) {
    try {
      await prisma.program.create({
        data: {
          name: p.programName, level: p.level, studyMode: p.studyMode, duration: p.duration,
          source: p.source, sourceUrl: p.sourceUrl, verificationStatus: "VERIFIED", verifiedAt: new Date(),
          degreeId: degree.id, specializationId: null, indianInstitutionId: inst.id,
        },
      });
      inserted++;
    } catch (e) {
      if (e.code === "P2002") { console.log(`SKIP race dup: ${p.institutionName}`); } else throw e;
    }
  }
  const after = await prisma.program.count();
  console.log(`After: Program=${after} (+${after - before}) Inserted=${inserted}`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });