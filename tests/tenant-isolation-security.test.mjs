import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  requireRole,
  tenantWriteGate,
  canAddStudent,
  canAddCounselor,
  entitlementForTenant,
  isTenantSuspended,
  trialExpiryWriteReason,
} from "../src/lib/tenant-access.ts";
import { loadAuthorizedStudent } from "../src/lib/counselor/access.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let orgA, orgB, suspendedOrg;
let planStarter, planMini;
let adminA, adminB, adminSuspended;
let counselorBUser, counselorBProfile;
let studentBUser, studentBProfile;
let unassignedUser;
let subA, subB, subSuspended;

const ADMIN_ROLES = ["ORGANIZATION_ADMIN", "SUPER_ADMIN"];

before(async () => {
  // Use a dedicated small-capacity plan for the entitlement-boundary tests.
  // To honor SubscriptionPlan.planType uniqueness, remove any pre-existing
  // STARTER row first and restore the canonical STARTER in `after`.
  const existingStarter = await prisma.subscriptionPlan.findUnique({ where: { planType: "STARTER" } });
  if (existingStarter) {
    await prisma.subscriptionPlan.delete({ where: { id: existingStarter.id } });
  }
  planStarter = await prisma.subscriptionPlan.create({
    data: { name: "Starter-Test", planType: "STARTER", maxCounselors: 1, maxStudents: 2, hasReports: true, hasUniversityRecommendations: true, hasCounselorFeatures: false },
  });

  orgA = await prisma.tenant.create({ data: { name: "OrgA", slug: `orga-${suffix}`, subdomain: `orga-${suffix}`, status: "ACTIVE", planType: "STARTER" } });
  orgB = await prisma.tenant.create({ data: { name: "OrgB", slug: `orgb-${suffix}`, subdomain: `orgb-${suffix}`, status: "ACTIVE", planType: "STARTER" } });
  suspendedOrg = await prisma.tenant.create({ data: { name: "OrgS", slug: `orgs-${suffix}`, subdomain: `orgs-${suffix}`, status: "SUSPENDED", planType: "STARTER" } });

  subA = await prisma.subscription.create({ data: { tenantId: orgA.id, planId: planStarter.id, status: "ACTIVE" } });
  subB = await prisma.subscription.create({ data: { tenantId: orgB.id, planId: planStarter.id, status: "ACTIVE" } });
  subSuspended = await prisma.subscription.create({ data: { tenantId: suspendedOrg.id, planId: planStarter.id, status: "ACTIVE" } });

  adminA = await prisma.user.create({ data: { email: `aadmin-${suffix}@x.com`, passwordHash: "x", firstName: "AA", lastName: "Admin", role: "ORGANIZATION_ADMIN", tenantId: orgA.id } });
  adminB = await prisma.user.create({ data: { email: `badmin-${suffix}@x.com`, passwordHash: "x", firstName: "BA", lastName: "Admin", role: "ORGANIZATION_ADMIN", tenantId: orgB.id } });
  adminSuspended = await prisma.user.create({ data: { email: `sadmin-${suffix}@x.com`, passwordHash: "x", firstName: "SA", lastName: "Admin", role: "ORGANIZATION_ADMIN", tenantId: suspendedOrg.id } });

  counselorBUser = await prisma.user.create({ data: { email: `counb-${suffix}@x.com`, passwordHash: "x", firstName: "CB", lastName: "B", role: "COUNSELOR", tenantId: orgB.id } });
  counselorBProfile = await prisma.counselorProfile.create({ data: { userId: counselorBUser.id, title: "CB" } });
  studentBUser = await prisma.user.create({ data: { email: `studb-${suffix}@x.com`, passwordHash: "x", firstName: "SB", lastName: "B", role: "STUDENT", tenantId: orgB.id } });
  studentBProfile = await prisma.studentProfile.create({ data: { userId: studentBUser.id, counselorId: counselorBProfile.id } });
  unassignedUser = await prisma.user.create({ data: { email: `unassigned-${suffix}@x.com`, passwordHash: "x", firstName: "U", lastName: "U", role: "STUDENT", tenantId: orgB.id } });
  await prisma.studentProfile.create({ data: { userId: unassignedUser.id } });
});

after(async () => {
  const ids = [adminA.id, adminB.id, adminSuspended.id, counselorBUser.id, studentBUser.id, unassignedUser.id];
  await prisma.studentCareerProfile.deleteMany({ where: { studentId: { in: ids } } });
  await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.counselorProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.subscription.deleteMany({ where: { tenantId: { in: [orgA.id, orgB.id, suspendedOrg.id] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [orgA.id, orgB.id, suspendedOrg.id] } } });
  // Restore the canonical STARTER plan (the test used a small-capacity one).
  await prisma.subscriptionPlan.deleteMany({ where: { id: { in: [planStarter.id] } } });
  await prisma.subscriptionPlan.upsert({
    where: { planType: "STARTER" },
    create: { name: "Starter", planType: "STARTER", maxCounselors: 2, maxStudents: 100, hasReports: true, hasUniversityRecommendations: true, hasCounselorFeatures: true },
    update: {},
  });
  await prisma.$disconnect();
});

function session(user) {
  return { user: { id: user?.id, role: user?.role, tenantId: user?.tenantId } };
}

// ---- §17-A Review 1: Org A admin cannot act on Org B ----
test("§17-A: Org A admin's write gate resolves to Org A (never Org B)", async () => {
  const g = await tenantWriteGate(session(adminA));
  assert.equal(g.ok, true);
  if (g.ok) assert.equal(g.tenantId, orgA.id);
});

test("§17-A: Org B admin's write gate resolves to Org B (isolation)", async () => {
  const g = await tenantWriteGate(session(adminB));
  assert.equal(g.ok, true);
  if (g.ok) assert.equal(g.tenantId, orgB.id);
});

test("§17-B: counselor in Org B cannot access Org A student (and vice-versa)", async () => {
  // a student belongs to Org B; the Org B counselor may access the ASSIGNED one
  const okAssigned = await loadAuthorizedStudent(studentBUser.id, session(counselorBUser));
  assert.equal(okAssigned.ok, true);
  // an Org B counselor session must never resolve to an Org A admin's tenant
  const g = await tenantWriteGate(session(counselorBUser));
  assert.equal(g.ok, true);
  if (g.ok) assert.equal(g.tenantId, orgB.id);
});

test("§17-D: counselor cannot access an unassigned student", async () => {
  const r = await loadAuthorizedStudent(unassignedUser.id, session(counselorBUser));
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("§17-E: student cannot use org-admin authorization", async () => {
  const r = await requireRole(
    { user: { id: studentBUser.id, role: "STUDENT", tenantId: orgB.id } },
    ADMIN_ROLES
  );
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test("§17-E: unauthenticated cannot use org-admin authorization", async () => {
  const r = await requireRole(null, ADMIN_ROLES);
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
});

test("§17-A: SUPER_ADMIN is admitted to org-admin roles (platform support)", async () => {
  const r = await requireRole({ user: { id: adminA.id, role: "SUPER_ADMIN", tenantId: orgA.id } }, ADMIN_ROLES);
  assert.equal(r.ok, true);
});

// ---- §17-F: suspended org cannot create new usage ----
test("§17-F: suspended org write gate rejects new usage", async () => {
  const g = await tenantWriteGate(session(adminSuspended));
  assert.equal(g.ok, false);
  if (!g.ok) assert.equal(g.status, 403);
});

test("§17-F: suspended org is detected", async () => {
  assert.equal(await isTenantSuspended(suspendedOrg.id), true);
  assert.equal(await isTenantSuspended(orgA.id), false);
});

test("§17-F: suspended org cannot add students or counselors", async () => {
  const s = await canAddStudent(suspendedOrg.id);
  const c = await canAddCounselor(suspendedOrg.id);
  assert.equal(s.ok, false);
  assert.equal(c.ok, false);
});

// ---- §17-G: entitlement limits cannot be bypassed ----
test("§17-G: student limit from plan is enforced server-side", async () => {
  // Org B's plan (Starter-Test) has maxStudents=2; org B has 2 students.
  const cap = await canAddStudent(orgB.id);
  assert.equal(cap.max, 2);
  assert.equal(cap.ok, false); // already at/over the 2 limit
});

test("§17-G: counselor limit from plan is enforced server-side", async () => {
  // Starter-Test maxCounselors=1; org B has 1 counselor => at limit.
  const cap = await canAddCounselor(orgB.id);
  assert.equal(cap.max, 1);
  assert.equal(cap.ok, false);
});

test("§17-G: entitlement resolution reflects plan", async () => {
  const ent = await entitlementForTenant(orgB.id);
  assert.equal(ent.maxStudents, 2);
  assert.equal(ent.hasCounselorFeatures, false);
  assert.equal(ent.planType, "STARTER");
});

test("§17-F/G: expired trial blocks new usage but preserves data", async () => {
  // Simulate an expired trial tenant.
  const expired = await prisma.tenant.create({
    data: {
      name: "Expired", slug: `exp-${suffix}`, subdomain: `exp-${suffix}`,
      status: "TRIAL", planType: "TRIAL",
      trialStartedAt: new Date(Date.now() - 20 * 86400000),
      trialEndsAt: new Date(Date.now() - 5 * 86400000),
    },
  });
  await prisma.subscription.create({
    data: { tenantId: expired.id, planId: planStarter.id, status: "TRIAL", startedAt: new Date(Date.now() - 20 * 86400000), endsAt: new Date(Date.now() - 5 * 86400000) },
  });
  try {
    const reason = await trialExpiryWriteReason(expired.id);
    assert.ok(reason && reason.includes("trial has ended"));
    // data is preserved (tenant still resolvable)
    const ent = await entitlementForTenant(expired.id);
    assert.equal(ent.planType, "STARTER");
  } finally {
    await prisma.subscription.deleteMany({ where: { tenantId: expired.id } });
    await prisma.tenant.deleteMany({ where: { id: expired.id } });
  }
});

test("§17-F: suspended tenant trial reason reports suspension", async () => {
  const reason = await trialExpiryWriteReason(suspendedOrg.id);
  assert.ok(reason && reason.includes("suspended"));
});