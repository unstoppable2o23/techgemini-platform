/**
 * Phase 19 — synthetic sales demo organization (idempotent).
 *
 * Creates a clearly-labeled demo tenant "TechGemini Demo School" with:
 *   - an ORGANIZATION_ADMIN
 *   - two COUNSELORS
 *   - a handful of STUDENTS with assessment results + career profiles
 * Plus a Professional-plan Subscription so the demo never hits trial limits.
 *
 * All demo data is synthetic and identified by the `isDemoOrg` marker in the
 * tenant contact name ("[DEMO]") and predictable demo@ emails. Safe for sales
 * demonstrations. Idempotent: reuses the existing tenant if present.
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const DEMO_SLUG = "techgemini-demo-school";
const DEMO_EMAIL_TAG = "@demo.techgemini.local";
const DEMO_PASSWORD = "DemoPass2026!";

async function ensureUser(data) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      ...data,
      passwordHash: await bcrypt.hash(data.passwordHash || DEMO_PASSWORD, 12),
    },
  });
}

async function seedDemoOrg() {
  let tenant = await prisma.tenant.findUnique({ where: { slug: DEMO_SLUG } });
  if (!tenant) {
    const now = new Date();
    const trialPlan = await prisma.subscriptionPlan.findUnique({ where: { planType: "TRIAL" } });
    const profPlan = await prisma.subscriptionPlan.findUnique({ where: { planType: "PROFESSIONAL" } });
    const planId = (profPlan || trialPlan).id;
    tenant = await prisma.tenant.create({
      data: {
        name: "TechGemini Demo School",
        slug: DEMO_SLUG,
        subdomain: DEMO_SLUG,
        brandName: "TechGemini Demo School",
        status: "ACTIVE",
        planType: "PROFESSIONAL",
        contactName: "Demo Admin",
        contactEmail: `admin${DEMO_EMAIL_TAG}`,
        contactPhone: "+1-555-0100",
        trialStartedAt: now,
        trialEndsAt: null,
        subscription: {
          create: { planId, status: "ACTIVE", startedAt: now, endsAt: null },
        },
      },
    });
    console.log("created demo tenant", tenant.id);
  }

  // Org admin
  const admin = await ensureUser({
    firstName: "Aamir", lastName: "Director",
    email: `admin${DEMO_EMAIL_TAG}`,
    role: "ORGANIZATION_ADMIN", tenantId: tenant.id, isActive: true,
  });

  // Counselors
  const c1 = await ensureUser({
    firstName: "Priya", lastName: "Kapoor",
    email: `counselor1${DEMO_EMAIL_TAG}`,
    role: "COUNSELOR", tenantId: tenant.id, isActive: true,
  });
  const c2 = await ensureUser({
    firstName: "Rohan", lastName: "Mehta",
    email: `counselor2${DEMO_EMAIL_TAG}`,
    role: "COUNSELOR", tenantId: tenant.id, isActive: true,
  });
  await prisma.counselorProfile.upsert({
    where: { userId: c1.id },
    create: { userId: c1.id, title: "Senior Career Counselor" },
    update: {},
  });
  await prisma.counselorProfile.upsert({
    where: { userId: c2.id },
    create: { userId: c2.id, title: "University Admissions Counselor" },
    update: {},
  });
  const [prof1, prof2] = await Promise.all([
    prisma.counselorProfile.findUnique({ where: { userId: c1.id } }),
    prisma.counselorProfile.findUnique({ where: { userId: c2.id } }),
  ]);

  // Students
  const students = [
    { first: "Ananya", last: "Sharma", grade: "12th", counselor: prof1, preferredCareer: "Data Science", preferredCareerId: null },
    { first: "Kabir", last: "Nair", grade: "11th", counselor: prof1, preferredCareer: "Architecture", preferredCareerId: null },
    { first: "Ishaan", last: "Reddy", grade: "12th", counselor: prof2, preferredCareer: "Medicine", preferredCareerId: null },
    { first: "Diya", last: "Iyer", grade: "10th", counselor: prof2, preferredCareer: "Product Design", preferredCareerId: null },
    { first: "Zara", last: "Khan", grade: "11th", counselor: prof1, preferredCareer: "Counseling", preferredCareerId: null },
  ];

  for (const [i, s] of students.entries()) {
    const email = `student${i + 1}${DEMO_EMAIL_TAG}`;
    const user = await ensureUser({
      firstName: s.first, lastName: s.last, email,
      role: "STUDENT", tenantId: tenant.id, isActive: true,
    });
    const sp = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, counselorId: s.counselor.id, gradeLevel: s.grade, status: "ONLINE" },
      update: {},
    });

    // Demo assessment results (synthetic)
    const streamTest = await prisma.test.findFirst({ where: { tenantId: tenant.id } });
    if (streamTest) {
      const has = await prisma.testResult.findFirst({ where: { studentId: sp.id, testId: streamTest.id } });
      if (!has) {
        await prisma.testResult.create({
          data: {
            studentId: sp.id,
            testId: streamTest.id,
            score: 78 + i,
            totalMarks: 100,
            percentage: 78 + i,
            submittedAt: new Date(Date.now() - (i + 1) * 86400000),
          },
        });
      }
    }

    // Demo career profile (synthetic signals) so career intelligence is populated
    const cp = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
    if (!cp) {
      await prisma.studentCareerProfile.create({
        data: {
          studentId: user.id,
          completeness: 85,
          assessmentCompleteness: 90,
          level: "COMPLETE",
          primaryInterests: [s.preferredCareer],
          strengths: ["Analytical thinking", "Communication"],
          metadata: { isDemo: true },
        },
      });
    }
  }

  console.log(
    JSON.stringify({
      demoOrg: "TechGemini Demo School",
      tenantId: tenant.id,
      orgAdmin: admin.email,
      counselors: [c1.email, c2.email],
      students: students.map((s) => `student${students.indexOf(s) + 1}${DEMO_EMAIL_TAG}@`),
      signinPassword: DEMO_PASSWORD,
    })
  );
  await prisma.$disconnect();
}

seedDemoOrg().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});