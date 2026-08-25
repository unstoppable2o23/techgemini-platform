const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error("No tenant found. Run prisma/seed.js first.");
    process.exit(1);
  }

  const jsonPath = path.join(__dirname, "universities-seed.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("Seed data not found at:", jsonPath);
    process.exit(1);
  }

  const records = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Importing ${records.length} universities...`);

  const existing = await prisma.university.findMany({
    where: { tenantId: tenant.id },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((u) => u.name));

  let imported = 0;
  let skipped = 0;

  for (const row of records) {
    if (existingNames.has(row.name)) {
      skipped++;
      continue;
    }

    await prisma.university.create({
      data: {
        tenantId: tenant.id,
        name: row.name,
        country: row.country,
        region: row.region || null,
        qsRank: row.qsRank || null,
        previousRank: row.previousRank || null,
        status: row.status || null,
        size: row.size || null,
        focus: row.focus || null,
        research: row.research || null,
        overallScore: row.overallScore || null,
        academicRepScore: row.academicRepScore || null,
        employerRepScore: row.employerRepScore || null,
        facultyStudentScore: row.facultyStudentScore || null,
        citationsScore: row.citationsScore || null,
        intlFacultyScore: row.intlFacultyScore || null,
        intlStudentScore: row.intlStudentScore || null,
        employmentScore: row.employmentScore || null,
        sustainabilityScore: row.sustainabilityScore || null,
      },
    });
    imported++;
  }

  console.log(`Imported: ${imported}, Skipped (already exist): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
