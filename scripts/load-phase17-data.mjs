// Phase 17 — load AcademicProgram catalogue + CareerProgramMapping into the DB.
// Idempotent: upserts by unique keys (program.slug, mapping careerId+programId).
// ADDITIVE only: never deletes existing Program / Career / University rows.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const dataDir = path.join(process.cwd(), "scripts", "phase17-data");
const mapsDir = path.join(dataDir, "mappings");

const REL = {
  PRIMARY: { priority: 10, strength: 1.0, confidence: 0.95 },
  COMMON: { priority: 20, strength: 0.8, confidence: 0.85 },
  SPECIALIZED: { priority: 30, strength: 0.7, confidence: 0.8 },
  RELEVANT: { priority: 40, strength: 0.6, confidence: 0.75 },
  OPTIONAL: { priority: 50, strength: 0.4, confidence: 0.6 },
};

async function main() {
  // 1) AcademicProgram catalogue
  const catalogue = JSON.parse(
    fs.readFileSync(path.join(dataDir, "academic-programs.json"), "utf8")
  );
  let progCreated = 0;
  let progExisting = 0;
  for (const p of catalogue.programs) {
    const existing = await prisma.academicProgram.findUnique({ where: { slug: p.slug } });
    if (existing) {
      progExisting++;
      continue;
    }
    await prisma.academicProgram.create({
      data: { name: p.name, slug: p.slug, level: p.level, category: p.category, isActive: true },
    });
    progCreated++;
  }
  console.log(`AcademicProgram: created=${progCreated} existing=${progExisting} totalCatalog=${catalogue.programs.length}`);

  // Preferred relationships per career — derive so PRIMARY/COMMON outrank others deterministically.
  // 2) CareerProgramMapping
  const files = fs.readdirSync(mapsDir).filter((f) => f.endsWith(".json"));
  const merged = {};
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(mapsDir, f), "utf8"));
    for (const [career, arr] of Object.entries(data)) merged[career] = arr;
  }

  const careers = await prisma.career.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const careerByName = new Map(careers.map((c) => [c.name, c.id]));
  const programs = await prisma.academicProgram.findMany({ select: { id: true, slug: true } });
  const programBySlug = new Map(programs.map((p) => [p.slug, p.id]));

  let mapped = 0;
  let skipped = 0;
  const notFound = [];
  for (const [careerName, entries] of Object.entries(merged)) {
    const careerId = careerByName.get(careerName);
    if (!careerId) {
      notFound.push(`career:${careerName}`);
      continue;
    }
    for (const m of entries) {
      const programId = programBySlug.get(m.program);
      if (!programId) {
        notFound.push(`program:${m.program} (for ${careerName})`);
        continue;
      }
      const meta = REL[m.relationshipType] || REL.RELEVANT;
      await prisma.careerProgramMapping.upsert({
        where: { careerId_programId: { careerId, programId } },
        update: {
          relationshipType: m.relationshipType,
          strength: meta.strength,
          confidence: meta.confidence,
          priority: meta.priority,
          rationale: m.rationale,
          isActive: true,
          source: "phase17-curated",
        },
        create: {
          careerId,
          programId,
          relationshipType: m.relationshipType,
          strength: meta.strength,
          confidence: meta.confidence,
          priority: meta.priority,
          rationale: m.rationale,
          isActive: true,
          source: "phase17-curated",
        },
      });
      mapped++;
    }
  }
  console.log(`CareerProgramMapping: upserted=${mapped}`);
  if (notFound.length) console.log(`Not resolved (${notFound.length}): ${notFound.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());