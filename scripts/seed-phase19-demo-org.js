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

  // Students — `signals` holds synthetic but realistic career signals whose trait
  // labels match real values in the active career catalog (interest/subject/skill/
  // personality traits), so the matching engine produces sensible recommendations.
  // `preferredCareer` is also resolved to a real catalog career id and stored on
  // the StudentProfile so the engine's canonical preferred-career boost surfaces
  // the student's stated field prominently (as happens for real enrolled students).
  const preferCareers = await prisma.career.findMany({
    where: { isActive: true, name: { in: ["Data Science", "Architecture", "Medicine", "Product Design", "Clinical Psychology"] } },
    select: { id: true, name: true },
  });
  const preferId = (name) => preferCareers.find((c) => c.name === name)?.id ?? null;

  const students = [
    {
      first: "Ananya", last: "Sharma", grade: "12th", counselor: prof1,
      preferredCareer: "Data Science", preferredCareerId: preferId("Data Science"),
      signals: [
        { dimension: "INTEREST", value: "Finding patterns in data", score: 90 },
        { dimension: "INTEREST", value: "Prediction and forecasting", score: 82 },
        { dimension: "SUBJECT", value: "Mathematics", score: 88 },
        { dimension: "SUBJECT", value: "Statistics", score: 80 },
        { dimension: "SKILL", value: "Python/R", score: 86 },
        { dimension: "SKILL", value: "Statistics", score: 78 },
        { dimension: "SKILL", value: "SQL", score: 72 },
        { dimension: "SKILL", value: "Machine Learning", score: 84 },
        { dimension: "PERSONALITY", value: "Analytical", score: 88 },
        { dimension: "PERSONALITY", value: "Curious", score: 80 },
      ],
    },
    {
      first: "Kabir", last: "Nair", grade: "11th", counselor: prof1,
      preferredCareer: "Architecture", preferredCareerId: preferId("Architecture"),
      signals: [
        { dimension: "INTEREST", value: "Design and spatial thinking", score: 90 },
        { dimension: "INTEREST", value: "Built environment", score: 80 },
        { dimension: "SUBJECT", value: "Physics", score: 84 },
        { dimension: "SUBJECT", value: "Mathematics", score: 82 },
        { dimension: "SKILL", value: "Drawing and drafting", score: 88 },
        { dimension: "SKILL", value: "3D modelling", score: 78 },
        { dimension: "SKILL", value: "Attention to detail", score: 82 },
        { dimension: "PERSONALITY", value: "Creative", score: 86 },
        { dimension: "PERSONALITY", value: "Precise", score: 78 },
        { dimension: "PERSONALITY", value: "Observant", score: 80 },
      ],
    },
    {
      first: "Ishaan", last: "Reddy", grade: "12th", counselor: prof2,
      preferredCareer: "Medicine", preferredCareerId: preferId("Medicine"),
      signals: [
        { dimension: "INTEREST", value: "Saving lives", score: 92 },
        { dimension: "INTEREST", value: "Anatomy and technique", score: 84 },
        { dimension: "SUBJECT", value: "Biology", score: 90 },
        { dimension: "SUBJECT", value: "Chemistry", score: 86 },
        { dimension: "SUBJECT", value: "Physics", score: 80 },
        { dimension: "SKILL", value: "Patient-focused care", score: 85 },
        { dimension: "SKILL", value: "Composure under pressure", score: 82 },
        { dimension: "PERSONALITY", value: "Empathetic", score: 88 },
        { dimension: "PERSONALITY", value: "Resilient", score: 82 },
        { dimension: "PERSONALITY", value: "Thorough", score: 84 },
      ],
    },
    {
      first: "Diya", last: "Iyer", grade: "10th", counselor: prof2,
      preferredCareer: "Product Design", preferredCareerId: preferId("Product Design"),
      signals: [
        { dimension: "INTEREST", value: "Innovation and product thinking", score: 90 },
        { dimension: "INTEREST", value: "Creativity and problem solving", score: 84 },
        { dimension: "SUBJECT", value: "Design", score: 86 },
        { dimension: "SUBJECT", value: "Computer Science", score: 78 },
        { dimension: "SKILL", value: "Prototyping", score: 84 },
        { dimension: "SKILL", value: "User research", score: 80 },
        { dimension: "SKILL", value: "Visual communication", score: 82 },
        { dimension: "PERSONALITY", value: "Innovative", score: 88 },
        { dimension: "PERSONALITY", value: "Empathetic", score: 78 },
      ],
    },
    {
      first: "Zara", last: "Khan", grade: "11th", counselor: prof1,
      preferredCareer: "Clinical Psychology", preferredCareerId: preferId("Clinical Psychology"),
      signals: [
        { dimension: "INTEREST", value: "Society and inequality", score: 86 },
        { dimension: "INTEREST", value: "Social change", score: 84 },
        { dimension: "SUBJECT", value: "Psychology", score: 90 },
        { dimension: "SUBJECT", value: "Sociology", score: 84 },
        { dimension: "SKILL", value: "Active listening", score: 92 },
        { dimension: "SKILL", value: "Empathy", score: 88 },
        { dimension: "SKILL", value: "Communication", score: 84 },
        { dimension: "PERSONALITY", value: "Empathetic", score: 92 },
        { dimension: "PERSONALITY", value: "Patient", score: 84 },
        { dimension: "PERSONALITY", value: "Observant", score: 80 },
      ],
    },
  ];

  for (const [i, s] of students.entries()) {
    const email = `student${i + 1}${DEMO_EMAIL_TAG}`;
    const user = await ensureUser({
      firstName: s.first, lastName: s.last, email,
      role: "STUDENT", tenantId: tenant.id, isActive: true,
    });
    const sp = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id, counselorId: s.counselor.id, gradeLevel: s.grade, status: "ONLINE",
        preferredCareer: s.preferredCareer, preferredCareerId: s.preferredCareerId,
      },
      update: {
        preferredCareer: s.preferredCareer, preferredCareerId: s.preferredCareerId,
      },
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
    let cp = await prisma.studentCareerProfile.findUnique({ where: { studentId: user.id } });
    if (!cp) {
      cp = await prisma.studentCareerProfile.create({
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

    // Write the synthetic career signals (existing profiles are also topped up,
    // since older seeds left profiles without signals). Idempotent per
    // (profileId, dimension, value, sourceType) unique constraint.
    for (const signal of s.signals || []) {
      await prisma.studentCareerSignal.upsert({
        where: {
          profileId_dimension_value_sourceType: {
            profileId: cp.id,
            dimension: signal.dimension,
            value: signal.value,
            sourceType: "ASSESSMENT",
          },
        },
        create: {
          profileId: cp.id,
          ...signal,
          sourceType: "ASSESSMENT",
          sourceVersion: "1.0",
          confidence: 1,
        },
        update: {},
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