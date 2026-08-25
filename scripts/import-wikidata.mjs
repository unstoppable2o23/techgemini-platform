import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const CHUNK_SIZE = 2000;

function norm(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function classifyType(name) {
  const n = name.toLowerCase();
  if (/polytechnic|institute|academy|school/.test(n)) return "Standalone";
  if (/college/.test(n)) return "College";
  return "University";
}

async function main() {
  const file = path.resolve(__dirname, "wikidata-institutions.json");
  const records = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Wikidata records: ${records.length}`);

  const existing = await prisma.indianInstitution.findMany({
    select: {
      id: true,
      name: true,
      state: true,
      district: true,
      website: true,
      wdId: true,
      source: true,
      type: true,
    },
  });
  console.log(`Existing institutions in DB: ${existing.length}`);

  const byWdId = new Map();
  const byName = new Map();
  for (const r of existing) {
    if (r.wdId) byWdId.set(r.wdId, r);
    const key = norm(r.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(r);
  }

  let merged = 0;
  let inserted = 0;
  let skippedAlready = 0;
  const toInsert = [];
  const processedWd = new Set();

  for (const w of records) {
    if (byWdId.has(w.wdId)) {
      skippedAlready++;
      continue;
    }

    const key = norm(w.name);
    const matches = byName.get(key) || [];

    if (matches.length > 0) {
      const target = matches.find((r) => r.source === "aishe") || matches[0];
      const data = { wdId: w.wdId };
      if (!target.website && w.website) data.website = w.website;
      if (!target.district && w.state) data.district = w.state;
      await prisma.indianInstitution.update({ where: { id: target.id }, data });
      merged++;
      target.website = data.website || target.website;
      target.district = data.district || target.district;
      target.wdId = w.wdId;
      byWdId.set(w.wdId, target);
      continue;
    }

    if (!processedWd.has(w.wdId)) {
      processedWd.add(w.wdId);
      toInsert.push({
        wdId: w.wdId,
        name: w.name,
        type: classifyType(w.name),
        state: "",
        district: w.state || null,
        website: w.website,
        yearOfEstablishment: null,
        location: null,
        institutionType: "Wikidata",
        management: null,
        universityAisheCode: null,
        universityName: null,
        source: "wikidata",
      });
    }
  }

  let created = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    const result = await prisma.indianInstitution.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    created += result.count;
    console.log(`  chunk ${i + chunk.length}/${toInsert.length} — inserted ${result.count}`);
  }

  console.log(`Done. Merged into existing: ${merged}, inserted new: ${created}, already processed: ${skippedAlready}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
