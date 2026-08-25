const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    await prisma.$executeRawUnsafe('CREATE TABLE "_raw_test" (id int)');
    console.log("simple DDL ok");
    await prisma.$executeRawUnsafe('DROP TABLE "_raw_test"');
    console.log("drop ok");
  } catch (e) {
    console.log("simple DDL ERR:", e.message.slice(0, 200));
    console.log("code:", e.code, "| meta:", JSON.stringify(e.meta));
  }
  try {
    await prisma.$executeRawUnsafe('CREATE TYPE "_test_enum" AS ENUM (\'A\', \'B\')');
    console.log("enum DDL ok");
    await prisma.$executeRawUnsafe('DROP TYPE "_test_enum"');
  } catch (e) {
    console.log("enum ERR:", e.message.slice(0, 200));
  }
  await prisma.$disconnect();
})();
