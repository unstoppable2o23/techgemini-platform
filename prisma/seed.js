const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Academy",
      slug: "default",
      subdomain: "app",
      brandName: "Study Abroad Platform",
      primaryColor: "#0F172A",
      accentColor: "#3B82F6",
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@platform.com" },
    update: {},
    create: {
      email: "superadmin@platform.com",
      passwordHash,
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      tenantId: tenant.id,
    },
  });

  const counselorUser = await prisma.user.upsert({
    where: { email: "counselor@platform.com" },
    update: {},
    create: {
      email: "counselor@platform.com",
      passwordHash,
      firstName: "Jane",
      lastName: "Counselor",
      role: "COUNSELOR",
      tenantId: tenant.id,
    },
  });

  await prisma.counselorProfile.upsert({
    where: { userId: counselorUser.id },
    update: {},
    create: {
      userId: counselorUser.id,
      title: "Senior Education Counselor",
      bio: "Experienced counselor specializing in US and UK admissions.",
      phone: "+1-555-0100",
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@platform.com" },
    update: {},
    create: {
      email: "student@platform.com",
      passwordHash,
      firstName: "John",
      lastName: "Student",
      role: "STUDENT",
      tenantId: tenant.id,
    },
  });

  const studentProfile = await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: { counselorId: counselorProfile.id },
    create: {
      userId: studentUser.id,
      gradeLevel: "12",
      targetCountry: "USA",
      counselorId: counselorProfile.id,
    },
  });

  await prisma.studentFeatureAccess.upsert({
    where: { studentProfileId: studentProfile.id },
    update: {},
    create: {
      studentProfileId: studentProfile.id,
      collegeSearch: true,
      collegeFinder: true,
      aiOddsCalculator: true,
      mockTests: true,
      scholarshipHub: true,
      appointments: true,
      webinars: true,
      analytics: true,
    },
  });

  console.log("Seeded successfully:");
  console.log("  SUPER_ADMIN: superadmin@platform.com / admin123");
  console.log("  COUNSELOR:   counselor@platform.com   / admin123");
  console.log("  STUDENT:     student@platform.com     / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
