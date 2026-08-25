const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  console.log("CareerTrait rows:", await prisma.careerTrait.count());
  console.log("Career rows:", await prisma.career.count());
  console.log("University rows:", await prisma.university.count());
  console.log("IndianInstitution rows:", await prisma.indianInstitution.count());
  console.log("TestAssignment rows:", await prisma.testAssignment.count());
  console.log("StudentProfile rows:", await prisma.studentProfile.count());
  await prisma.$disconnect();
})();
