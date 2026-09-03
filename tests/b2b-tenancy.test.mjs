import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  entitlementForTenant,
  trialExpiryWriteReason,
  tenantWriteGate,
  canAddStudent,
} from "../src/lib/tenant-access.ts";

const prisma = new PrismaClient();
const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 7);

let trialTenant, profPlan;

before(async () => {
  profPlan = await prisma.subscriptionPlan.findFirst({ where: { planType: "PROFESSIONAL" } });
});

after(async () => {
  await prisma.subscription.deleteMany({ where: { tenantId: trialTenant?.id } });
  await prisma.tenant.deleteMany({ where: { id: trialTenant?.id } });
  await prisma.$disconnect();
});

test("§19: canonical subscription plans are seeded", async () => {
  const planTypes = ["TRIAL", "STARTER", "PROFESSIONAL", "ENTERPRISE"];
  const plans = await prisma.subscriptionPlan.findMany({ where: { planType: { in: planTypes } } });
  const found = new Set(plans.map((p) => p.planType));
  for (const t of planTypes) assert.ok(found.has(t), `missing plan ${t}`);
});

test("§19: new trial organization is created in TRIAL state with a subscription", async () => {
  const now = new Date();
  const trialPlan = await prisma.subscriptionPlan.findUnique({ where: { planType: "TRIAL" } });
  assert.ok(trialPlan);

  trialTenant = await prisma.tenant.create({
    data: {
      name: "Trial Org",
      slug: `to-${suffix}`,
      subdomain: `to-${suffix}`,
      status: "TRIAL",
      planType: "TRIAL",
      trialStartedAt: now,
      trialEndsAt: new Date(now.getTime() + 14 * 86400000),
      subscription: { create: { planId: trialPlan.id, status: "TRIAL", startedAt: now, endsAt: new Date(now.getTime() + 14 * 86400000) } },
    },
  });

  const refetched = await prisma.tenant.findUnique({ where: { id: trialTenant.id }, include: { subscription: true } });
  assert.equal(refetched.status, "TRIAL");
  assert.equal(refetched.planType, "TRIAL");
  assert.ok(refetched.subscription);
  assert.equal(refetched.subscription.status, "TRIAL");
  // Active trial: no expiry write-block reason
  assert.equal(await trialExpiryWriteReason(trialTenant.id), null);
});

test("§19: trial organization entitlement reflects trial plan", async () => {
  const ent = await entitlementForTenant(trialTenant.id);
  assert.equal(ent.planType, "TRIAL");
  assert.equal(ent.hasReports, true);
  assert.equal(ent.hasUniversityRecommendations, true);
});

test("§19: trial org can create usage while within trial window", async () => {
  const caps = await canAddStudent(trialTenant.id);
  assert.equal(caps.ok, true);
  const gate = await tenantWriteGate({ user: { id: "fake", role: "ORGANIZATION_ADMIN", tenantId: trialTenant.id } });
  assert.equal(gate.ok, true);
});

test("§19: demo organization exists for sales demos", async () => {
  const demo = await prisma.tenant.findUnique({ where: { slug: "techgemini-demo-school" } });
  assert.ok(demo, "demo org missing");
  assert.equal(demo.status, "ACTIVE");
  const admin = await prisma.user.findFirst({
    where: { tenantId: demo.id, role: "ORGANIZATION_ADMIN" },
  });
  assert.ok(admin, "demo org-admin missing");
  const counselors = await prisma.user.count({ where: { tenantId: demo.id, role: "COUNSELOR" } });
  const students = await prisma.user.count({ where: { tenantId: demo.id, role: "STUDENT" } });
  assert.ok(counselors >= 1);
  assert.ok(students >= 1);
});

test("§19: existing grandfathered tenant is not broken by subscription model", async () => {
  const defaults = await prisma.tenant.findMany({ where: { isActive: true }, include: { subscription: true } });
  // Every active tenant should have a subscription so it is never gated.
  for (const t of defaults) {
    assert.ok(t.subscription, `tenant ${t.name} missing subscription`);
    assert.ok(t.status !== "SUSPENDED");
  }
});

test("§19: demo org uses a paid (non-trial) plan", async () => {
  const demo = await prisma.tenant.findUnique({ where: { slug: "techgemini-demo-school" }, include: { subscription: { include: { plan: true } } } });
  assert.equal(demo.status, "ACTIVE");
  assert.ok(demo.subscription);
  assert.notEqual(demo.subscription.plan.planType, "TRIAL");
});