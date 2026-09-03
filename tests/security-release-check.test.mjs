// Phase 18.1 — Security Release Check.
//
// Source-contract guard for the release security invariants:
//  - Every /api/student/* route self-scopes reads/writes to session.user.id.
//  - Every /api/counselor/students/[id]/* route enforces counselor isolation
//    (loadAuthorizedStudent / explicit assignment check).
//  - Every /api/admin/* route is role-gated on staff roles.
//  - No student/counselor/admin data route is reachable without authentication.
//
// getServerSession cannot be mocked in the node:test harness, so these are
// static source-contract checks (read the route files and assert the guard
// patterns). This parallels the Phase 18 P0 route checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";

function listRouteFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listRouteFiles(p));
    else if (e.name === "route.ts") out.push(p);
  }
  return out;
}

function read(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
}

// Convert an absolute path under the repo to a repo-relative test import path.
function relPath(abs) {
  const idx = abs.indexOf(sep + "src");
  const seg = abs.slice(idx + 1).replace(/\\/g, "/"); // e.g. "src/app/api/student/x/route.ts"
  return seg;
}

// ---------------------------------------------------------------------------
// 1. Student routes: all authenticate and self-scope to session.user.id
// ---------------------------------------------------------------------------
test("release: every student route authenticates and self-scopes to the session", () => {
  const base = join(process.cwd(), "src/app/api/student");
  const routes = listRouteFiles(base);
  assert.ok(routes.length >= 10, `expected many student routes, found ${routes.length}`);
  for (const r of routes) {
    const rel = relPath(r);
    const src = read(rel);
    assert.match(src, /getServerSession/, `${rel} must call getServerSession`);
    // Must derive the subject from the signed-in session. The subject must be
    // the user (personal data) or the tenant (for generic/homepage lookups);
    // either way it must NEVER be a value supplied by the client.
    const usesSessionScope =
      /session\.user\.id/.test(src) ||
      /session\.user\.tenantId/.test(src) ||
      /(const|let)\s+user\s*=\s*session\.user/.test(src);
    assert.ok(usesSessionScope, `${rel} must scope to the session`);
    // Must NOT accept a client-supplied studentId that overrides the session.
    assert.ok(!/get\("studentId"\)|body\.studentId|req\.studentId|\.studentId\s*=/.test(src), `${rel} must not read a client-supplied studentId`);
  }
});

// ---------------------------------------------------------------------------
// 2. Counselor student routes: all enforce isolation via loadAuthorizedStudent
//    or an explicit assignment/tenant check.
// ---------------------------------------------------------------------------
test("release: every counselor student route enforces counselor isolation", () => {
  const base = join(process.cwd(), "src/app/api/counselor/students");
  const routes = listRouteFiles(base);
  assert.ok(routes.length >= 10, `expected many counselor routes, found ${routes.length}`);
  for (const r of routes) {
    const rel = relPath(r);
    const src = read(rel);
    assert.match(src, /getServerSession/, `${rel} must authenticate`);
    const hasIsolation =
      /loadAuthorizedStudent/.test(src) ||
      /counselor:\s*\{\s*userId/.test(src) ||
      /counselor\s*=\s*\{\s*userId/.test(src) ||
      /counselor\s*=\s*\{\s*userId: user\.id/.test(src) ||
      /\bset?:?\s*counselorId\b/.test(src) ||
      /userId:\s*user\.id/.test(src) ||
      /userId: session\.user\.id/.test(src) ||
      /session\.user\.id\s*===\s*id/.test(src);
    assert.ok(hasIsolation, `${rel} must enforce counselor isolation`);
  }
});

// ---------------------------------------------------------------------------
// 3. Admin routes: all role-gated on staff roles
// ---------------------------------------------------------------------------
test("release: every admin route is role-gated on staff roles", () => {
  const base = join(process.cwd(), "src/app/api/admin");
  const routes = listRouteFiles(base);
  assert.ok(routes.length >= 1, "expected admin routes");
  for (const r of routes) {
    const rel = relPath(r);
    const src = read(rel);
    assert.match(src, /getServerSession/, `${rel} must authenticate`);
    assert.match(src, /SUPER_ADMIN|UNIVERSITY_ADMIN|ADMIN/, `${rel} must role-gate on staff roles`);
  }
});

// ---------------------------------------------------------------------------
// 4. Shared/tenant surface used by students and counselors is session-guarded.
// ---------------------------------------------------------------------------
test("release: appointments, chat and notifications routes are session-guarded", () => {
  for (const rel of [
    "src/app/api/appointments/route.ts",
    "src/app/api/appointments/[id]/route.ts",
    "src/app/api/chat/route.ts",
    "src/app/api/notifications/route.ts",
    "src/app/api/universities/[id]/profile/route.ts",
  ]) {
    const src = read(rel);
    assert.match(src, /getServerSession/, `${rel} must authenticate`);
  }
});

// ---------------------------------------------------------------------------
// 5. Lock in the Phase 18 P0 fixes (also asserted in commercial-readiness.test.mjs).
// ---------------------------------------------------------------------------
test("release: Phase 18 P0 routes remain locked (no client studentId override)", () => {
  const profile = read("src/app/api/universities/[id]/profile/route.ts");
  assert.match(profile, /session\.user\.id/, "university profile derives studentId from session");
  assert.ok(!profile.includes('searchParams.get("studentId")'), "no client studentId in profile route");
  const compare = read("src/app/api/student/compare/route.ts");
  assert.ok(
    !/body\.studentId|=>\s*\{\s*const\s*\{\s*institutionIds,\s*dataset,\s*careerId,\s*studentId/.test(compare),
    "compare must not read studentId from body"
  );
  assert.match(compare, /const effectiveStudentId = session\.user\.id/, "compare forces session id");
});