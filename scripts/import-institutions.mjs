import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const CHUNK_SIZE = 2000;

async function main() {
  const file = path.resolve(__dirname, "institutions-data.json");
  const records = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Institutions file: ${records.length} records`);

  const count = await prisma.indianInstitution.count();
  if (count > 0) {
    console.log(`DB already has ${count} institutions — skipping import.`);
    return;
  }

  let created = 0;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const result = await prisma.indianInstitution.createMany({
      data: chunk.map((r) => ({
        aisheCode: r.aisheCode,
        name: r.name,
        type: r.type,
        state: r.state,
        district: r.district,
        website: r.website,
        yearOfEstablishment: r.yearOfEstablishment,
        location: r.location,
        institutionType: r.institutionType,
        management: r.management,
        universityAisheCode: r.universityAisheCode,
        universityName: r.universityName,
      })),
      skipDuplicates: true,
    });
    created += result.count;
    console.log(`  chunk ${i + chunk.length}/${records.length} — inserted ${result.count}`);
  }

  console.log(`Import complete. Inserted ${created} institutions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
