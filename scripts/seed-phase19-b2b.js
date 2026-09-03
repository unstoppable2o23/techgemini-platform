/**
 * Phase 19 — B2B seed: subscription plans + tenant backfill (idempotent).
 *
 * - Creates the four canonical SubscriptionPlan records (TRIAL/STARTER/
 *   PROFESSIONAL/ENTERPRISE) if absent.
 * - Backfills any pre-existing tenant that has no Subscription so it is NOT
 *   blocked by the new trial/suspension gate: marks it ACTIVE, sets a
 *   non-trial planType, and attaches an ACTIVE Subscription on the matching
 *   plan. This is additive and non-destructive.
 *
 * Safe to run on prod (pre-existing tenants become grandfathered ACTIVE) and
 * idempotent (no-ops when plans/tenants already provisioned).
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PLANS = [
  { name: "Trial", planType: "TRIAL", maxCounselors: 1, maxStudents: 25, hasReports: true, hasUniversityRecommendations: true, hasCounselorFeatures: true, trialDays: 14, isActive: true },
  { name: "Starter", planType: "STARTER", maxCounselors: 2, maxStudents: 100, hasReports: true, hasUniversityRecommendations: true, hasCounselorFeatures: true, isActive: true },
  { name: "Professional", planType: "PROFESSIONAL", maxCounselors: 10, maxStudents: 1000, hasReports: true, hasUniversityRecommendations: true, hasCounselorFeatures: true, isActive: true },
  { name: "Enterprise", planType: "ENTERPRISE", maxCounselors: 100, maxStudents: 100000, hasReports: true, hasUniversityRecommendations: true, hasCounselorFeatures: true, isActive: true },
];

async function seedPlans() {
  const byName = {};
  for (const p of PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { planType: p.planType } });
    if (existing) {
      byName[p.planType] = existing;
    } else {
      byName[p.planType] = await prisma.subscriptionPlan.create({ data: p });
    }
  }
  return byName;
}

async function backfillTenants(plans) {
  // Default plan for grandfathered existing tenants = Professional
  // (full-featured; they pre-date the subscription gate and must keep working).
  const prof = plans.PROFESSIONAL;
  const tenants = await prisma.tenant.findMany({
    include: { subscription: true },
  });
  let updated = 0;
  for (const t of tenants) {
    if (t.subscription) continue;
    await prisma.tenant.update({
      where: { id: t.id },
      data: {
        status: "ACTIVE",
        planType: "PROFESSIONAL",
      },
    });
    await prisma.subscription.create({
      data: {
        tenantId: t.id,
        planId: prof.id,
        status: "ACTIVE",
        startedAt: t.createdAt,
        endsAt: null,
      },
    });
    updated++;
  }
  return updated;
}

(async () => {
  const plans = await seedPlans();
  const backfilled = await backfillTenants(plans);
  console.log(JSON.stringify({ seededPlans: Object.keys(plans).length, backfilledTenants: backfilled }));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});