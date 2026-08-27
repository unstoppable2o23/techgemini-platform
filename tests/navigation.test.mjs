import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STUDENT_GROUPS,
  COUNSELOR_GROUPS,
  canShowItem,
  isGroupActive,
} from "../src/components/layout/nav-config.ts";

// Routes that actually exist in the app (used to guarantee no invented links).
const REAL_STUDENT_ROUTES = new Set([
  "/career-matches",
  "/career-library",
  "/career-profile",
  "/education",
  "/universities",
  "/college-finder",
  "/assessments",
  "/mock-tests",
  "/appointments",
  "/messages",
  "/odds-calculator",
  "/scholarships",
  "/indian-colleges",
  "/career-preferences",
  "/saved",
  "/dashboard",
  "/settings",
]);

const REAL_COUNSELOR_ROUTES = new Set([
  "/students",
  "/tests/assign",
  "/career-library",
  "/universities",
  "/indian-colleges",
  "/calendar",
  "/messages",
  "/analytics",
  "/webinars",
  "/settings",
  "/admin/counselors",
  "/admin/universities",
  "/dashboard",
]);

function allItems(groups) {
  return groups.flatMap((g) => g.items);
}

test("student groups follow the expected architecture", () => {
  assert.deepEqual(
    STUDENT_GROUPS.map((g) => g.label),
    ["Discover", "Plan", "Assess", "Connect", "More"]
  );
});

test("Career Matches is first and primary in Discover", () => {
  const discover = STUDENT_GROUPS[0];
  assert.equal(discover.items[0].label, "Career Matches");
  assert.equal(discover.items[0].primary, true);
});

test("student groups never link to a non-existent route", () => {
  for (const it of allItems(STUDENT_GROUPS)) {
    const base = it.href.split("?")[0];
    assert.ok(REAL_STUDENT_ROUTES.has(base), `student route missing: ${it.href}`);
  }
});

test("counselor groups are logically grouped (no flat array)", () => {
  assert.deepEqual(
    COUNSELOR_GROUPS.map((g) => g.label),
    ["Students", "Assessments", "Resources", "Connect", "Insights", "More"]
  );
});

test("counselor Resources keeps Universities and Indian Colleges distinct", () => {
  const resources = COUNSELOR_GROUPS.find((g) => g.label === "Resources");
  const universities = resources.items.find((i) => i.label === "Universities");
  const indian = resources.items.find(
    (i) => i.label === "Indian Colleges & Universities"
  );
  assert.equal(universities.href, "/universities");
  assert.equal(indian.href, "/indian-colleges");
  assert.notEqual(universities.href, indian.href);
});

test("counselor groups never link to a non-existent route", () => {
  for (const it of allItems(COUNSELOR_GROUPS)) {
    const base = it.href.split("?")[0];
    assert.ok(REAL_COUNSELOR_ROUTES.has(base), `counselor route missing: ${it.href}`);
  }
});

test("locked feature: item is still present in the menu (visible, not filtered out)", () => {
  const plan = STUDENT_GROUPS.find((g) => g.label === "Plan");
  const collegeFinder = plan.items.find((i) => i.label === "College Finder");
  assert.ok(collegeFinder, "College Finder must remain in the Plan group");
  assert.equal(collegeFinder.featureKey, "collegeFinder");
  // With the flag off, canShowItem returns false => locked styling, but the
  // item is NEVER removed from the rendered list.
  assert.equal(canShowItem({ collegeFinder: false }, collegeFinder), false);
  assert.equal(canShowItem({ collegeFinder: true }, collegeFinder), true);
});

test("enabled feature navigates (canShowItem true for an enabled featureKey)", () => {
  const assess = STUDENT_GROUPS.find((g) => g.label === "Assess");
  const mock = assess.items.find((i) => i.label === "Mock Tests");
  assert.equal(canShowItem({ mockTests: true }, mock), true);
  // Items without a featureKey are always shown (role-level links).
  const discover = STUDENT_GROUPS[0];
  assert.equal(canShowItem({}, discover.items[0]), true);
});

test("active parent state: student routes", () => {
  assert.equal(isGroupActive(STUDENT_GROUPS[0], "/career-matches"), true); // Discover
  assert.equal(isGroupActive(STUDENT_GROUPS[1], "/career-profile"), true); // Plan
  assert.equal(isGroupActive(STUDENT_GROUPS[1], "/career-preferences"), true); // Plan extra
  assert.equal(isGroupActive(STUDENT_GROUPS[1], "/education"), true); // Plan
  assert.equal(isGroupActive(STUDENT_GROUPS[1], "/indian-colleges"), false); // Plan no longer owns it
  assert.equal(isGroupActive(STUDENT_GROUPS[4], "/indian-colleges"), true); // More owns it
  assert.equal(isGroupActive(STUDENT_GROUPS[2], "/assessments"), true); // Assess
  assert.equal(isGroupActive(STUDENT_GROUPS[3], "/messages"), true); // Connect
});

test("active parent state: counselor routes", () => {
  const byLabel = (l) => COUNSELOR_GROUPS.find((g) => g.label === l);
  assert.equal(isGroupActive(byLabel("Students"), "/students"), true);
  assert.equal(isGroupActive(byLabel("Students"), "/students/abc"), true); // Student 360 child
  assert.equal(isGroupActive(byLabel("Assessments"), "/tests/assign"), true);
  assert.equal(isGroupActive(byLabel("Resources"), "/universities"), true);
  assert.equal(isGroupActive(byLabel("Resources"), "/indian-colleges"), true);
  assert.equal(isGroupActive(byLabel("Connect"), "/calendar"), true);
  assert.equal(isGroupActive(byLabel("Connect"), "/messages"), true);
  assert.equal(isGroupActive(byLabel("Insights"), "/analytics"), true);
  assert.equal(isGroupActive(byLabel("More"), "/admin/counselors"), true); // super-admin extra
});
