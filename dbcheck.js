const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    console.log("careers:", await prisma.career.count());
    const r = await prisma.$executeRawUnsafe('SELECT 1 as ok');
    console.log("raw query ok:", r === 0 || r === 1);
  } catch (e) {
    console.log("ERR:", e.message.slice(0, 120));
  }
  await prisma.$disconnect();
})();
