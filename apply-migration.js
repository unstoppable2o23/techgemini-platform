const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const sql = fs.readFileSync(
    "prisma/migrations/20260825000000_career_profile/migration.sql",
    "utf8"
  );
  // split into statements; strip standalone comment lines from each chunk
  const chunks = sql
    .split(";")
    .map((chunk) =>
      chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((chunk) => chunk.length > 0);

  console.log("statements to run:", chunks.length);
  for (const [i, stmt] of chunks.entries()) {
    try {
      await prisma.$executeRawUnsafe(stmt + ";");
      console.log(`  [${i + 1}] ok`);
    } catch (e) {
      const msg = e.message.slice(0, 120);
      if (msg.includes("already exists")) {
        console.log(`  [${i + 1}] already exists (idempotent skip)`);
      } else {
        console.log(`  [${i + 1}] ERR: ${msg}`);
        process.exitCode = 1;
      }
    }
  }

  console.log("profiles:", await prisma.studentCareerProfile.count());
  console.log("signals:", await prisma.studentCareerSignal.count());
  await prisma.$disconnect();
})();
