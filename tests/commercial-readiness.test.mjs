import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { getUniversityProfile } from "../src/lib/university-profile/profile.ts";

const prisma = new PrismaClient();

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

// =====================================================================
// 1. P0-1: /api/universities/[id]/profile must NOT trust a client studentId
// =====================================================================
test("P0-1: university profile route binds student context to the session", () => {
  const src = read("src/app/api/universities/[id]/profile/route.ts");
  assert.match(src, /getServerSession/, "route must authenticate");
  assert.match(src, /Unauthorized/, "route must reject unauthenticated callers");
  // The route must not read a client-supplied studentId query param.
  assert.ok(
    !src.includes('searchParams.get("studentId")'),
    "route must not accept client-supplied `studentId`"
  );
  // The subject student must be derived from the authenticated session.
  assert.match(src, /session\.user\.id/, "must derive studentId from session");
});

// =====================================================================
// 2. P0-2: /api/student/compare must force the session id
// =====================================================================
test("P0-2: compare route never trusts a client-supplied studentId", () => {
  const src = read("src/app/api/student/compare/route.ts");
  assert.match(src, /session\.user\.id/, "must use session user id");
  // The body no longer destructures studentId, and effectiveStudentId is forced.
  assert.ok(
    !/const\s*\{\s*institutionIds,\s*dataset,\s*careerId,\s*studentId/.test(src),
    "body must not include a studentId override"
  );
  assert.match(
    src,
    /const effectiveStudentId = session\.user\.id/,
    "effectiveStudentId must be forced to the session id"
  );
});

// =====================================================================
// 3. Data-isolation invariant at the data layer:
//    studentContext is only produced when a student id is supplied and matched.
// =====================================================================
test("P0 isolation: university student context requires an explicit studentId context", async () => {
  const inst = await prisma.indianInstitution.findFirst({
    where: { programs: { some: { verificationStatus: "VERIFIED" } } },
  });
  assert.ok(inst, "need an institution with verified programs");
  const id = inst.id;

  // No student context supplied -> no personalized context.
  const anonymous = await getUniversityProfile(id, "indian");
  assert.equal(anonymous.studentContext, null, "anonymous caller must get no student context");

  // A supplied but non-existent studentId yields null context (no crash, no fabrication).
  const ghost = await getUniversityProfile(id, "indian", {
    studentId: "does-not-exist",
    careerId: "fake-career",
  });
  assert.equal(ghost.studentContext, null, "unknown student must not produce context");
});

// =====================================================================
// 4. Landing page: honest WHAT/WHO/WHY/HOW messaging, no exaggerated AI claims
// =====================================================================
test("landing page presents honest positioning without exaggerated AI claims", () => {
  const src = read("src/app/page.tsx");
  assert.match(src, /Discover the career and study path that fits/, "hero WHAT");
  assert.match(src, /How it works/, "HOW section");
  assert.match(src, /Who it.*for/, "WHO section");
  // Recommended honest tagline present.
  assert.match(src, /suitable career pathways/, "honest tagline");
  // No exaggerated claims.
  assert.ok(!/100% accurate/i.test(src), "must not claim 100% accurate");
  assert.ok(!/guaranteed job/i.test(src), "must not claim a guaranteed job");
  assert.ok(!/guaranteed admission/i.test(src), "must not claim guaranteed admission");
  assert.ok(!/guaranteed success/i.test(src), "must not claim guaranteed success");
  assert.match(src, /not a guaranteed outcome/, "honest disclaimer");
});

// =====================================================================
// 5. Demo page is clearly labeled synthetic
// =====================================================================
test("demo page is clearly labeled as a synthetic sample", () => {
  const src = read("src/app/demo/page.tsx");
  assert.match(src, /synthetic/, "must be labelled synthetic");
  assert.match(src, /no\s+real student/i, "must state no real student");
});

// =====================================================================
// 6. Odds calculator no longer overstates "AI"
// =====================================================================
test("odds calculator is honestly labelled with a disclaimer", () => {
  const src = read("src/app/(student)/odds-calculator/page.tsx");
  assert.ok(!/AI Odds Calculator/.test(src), "must not label it AI Odds Calculator");
  assert.match(src, /Chance Estimator/, "relabelled as an estimator");
  assert.match(src, /not a prediction/i, "must include a non-prediction disclaimer");
});

// =====================================================================
// 7. Career-matches funnel + jargon removed
// =====================================================================
test("career matches page has next-step funnel and no signal jargon", () => {
  const src = read("src/app/(student)/career-matches/career-matches-client.tsx");
  assert.ok(!/career signals/.test(src), "must not use the 'career signals' jargon");
  assert.match(src, /What&apos;s next\?|What.s next\?/, "must include a next-step funnel");
  assert.match(src, /Book a session/, "funnel offers a counseling CTA");
});

// =====================================================================
// 8. Career profile no longer claims recommendations are "coming soon"
// =====================================================================
test("career profile links to live matches (no stale future-update copy)", () => {
  const src = read("src/app/(student)/career-profile/career-profile-client.tsx");
  assert.ok(
    !/coming in a future update/.test(src),
    "must not claim recommendations are coming later"
  );
  assert.match(src, /career-matches/, "must link to live career matches");
});

// =====================================================================
// 9. Global error boundary exists
// =====================================================================
test("a root error boundary exists", () => {
  const src = read("src/app/error.tsx");
  assert.match(src, /"use client"/, "error boundary is a client component");
  assert.match(src, /Something went wrong/, "friendly fallback");
});