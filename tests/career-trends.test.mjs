import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  computeTrendScore,
  determineClassifications,
  demandScore,
  growthScore,
  parseGrowthPercent,
  normalizeDemandLevel,
} from "../src/lib/career-trends/normalization.ts";
import {
  getTrends,
  getCareerTrends,
  getTrendsForCareers,
  buildPersonalizedTrending,
} from "../src/lib/career-trends/service.ts";

const prisma = new PrismaClient();
const TEST_REGION = "TEST_REGION_PH8";

let careerId = null;

before(async () => {
  const career = await prisma.career.findFirst({
    where: { isActive: true },
    select: { id: true },
  });
  if (!career) throw new Error("No active career found for tests");
  careerId = career.id;

  await prisma.careerTrend.deleteMany({
    where: { careerId, region: TEST_REGION },
  });

  await prisma.careerTrend.create({
    data: {
      careerId,
      period: "2030",
      region: TEST_REGION,
      trendScore: 80,
      demandIndicator: "HIGH",
      growthIndicator: "+40%",
      trending: true,
      emerging: true,
      fastGrowing: true,
      futureFacing: false,
      source: "SYSTEM_DERIVED",
    },
  });

  await prisma.careerTrend.create({
    data: {
      careerId,
      period: "2029",
      region: TEST_REGION,
      trendScore: 55,
      demandIndicator: "MEDIUM",
      growthIndicator: "+10%",
      trending: false,
      emerging: true,
      fastGrowing: false,
      futureFacing: true,
      source: "SYSTEM_DERIVED",
    },
  });
});

after(async () => {
  if (careerId) {
    await prisma.careerTrend.deleteMany({
      where: { careerId, region: TEST_REGION },
    });
  }
  await prisma.$disconnect();
});

// ---------- Normalization (pure functions) ----------

test("normalizeDemandLevel maps known values", () => {
  assert.equal(normalizeDemandLevel("High"), "HIGH");
  assert.equal(normalizeDemandLevel("medium"), "MEDIUM");
  assert.equal(normalizeDemandLevel("LOW"), "LOW");
  assert.equal(normalizeDemandLevel(null), "UNKNOWN");
});

test("parseGrowthPercent extracts numeric percentage", () => {
  assert.equal(parseGrowthPercent("+40%"), 40);
  assert.equal(parseGrowthPercent("35"), 35);
  assert.equal(parseGrowthPercent("up to 50%"), 50);
  assert.equal(parseGrowthPercent("n/a"), null);
});

test("demandScore and growthScore bounds", () => {
  assert.equal(demandScore("HIGH"), 100);
  assert.equal(demandScore("LOW"), 30);
  assert.equal(growthScore("+40%"), 40);
  assert.equal(growthScore("garbage"), 50);
});

test("computeTrendScore is deterministic and within 0-100", () => {
  const input = {
    demandLevel: "High",
    jobGrowth: "+40%",
    isEmerging: true,
    futureOutlook: "Strong",
  };
  const a = computeTrendScore(input);
  const b = computeTrendScore(input);
  assert.equal(a, b);
  assert.ok(a >= 0 && a <= 100);
});

test("determineClassifications derives all four types correctly", () => {
  const cls = determineClassifications({
    demandLevel: "High",
    jobGrowth: "+40%",
    isEmerging: true,
    futureOutlook: "Strong",
  });
  assert.ok(cls.includes("EMERGING"));
  assert.ok(cls.includes("FAST_GROWING"));
  assert.ok(cls.includes("FUTURE"));
  assert.ok(cls.includes("TRENDING"));
});

// ---------- Service: listing & filtering ----------

test("getTrends with region filter isolates test data", async () => {
  const res = await getTrends({ region: TEST_REGION });
  assert.equal(res.trends.length, 2);
  assert.equal(res.total, 2);
});

test("getTrends type filter returns only matching classification", async () => {
  const trending = await getTrends({ type: "trending", region: TEST_REGION });
  assert.equal(trending.trends.length, 1);
  assert.equal(trending.trends[0].trendScore, 80);

  const future = await getTrends({ type: "future", region: TEST_REGION });
  assert.equal(future.trends.length, 1);
  assert.equal(future.trends[0].period, "2029");

  const fast = await getTrends({ type: "fast-growing", region: TEST_REGION });
  assert.equal(fast.trends.length, 1);
  assert.equal(fast.trends[0].trendScore, 80);
});

test("getTrends period filter supports historical records", async () => {
  const res = await getTrends({ period: "2029", region: TEST_REGION });
  assert.equal(res.trends.length, 1);
  assert.equal(res.trends[0].period, "2029");
});

test("getTrends pagination works", async () => {
  const res = await getTrends({ region: TEST_REGION, limit: 1, page: 1 });
  assert.equal(res.trends.length, 1);
  assert.equal(res.totalPages, 2);
});

// ---------- Service: career detail ----------

test("getCareerTrends returns union of classifications and picks latest", async () => {
  const res = await getCareerTrends(careerId);
  assert.ok(res.career);
  assert.ok(res.classifications.includes("EMERGING"));
  assert.ok(res.classifications.includes("FUTURE"));
  assert.ok(res.classifications.includes("TRENDING"));
  assert.equal(res.trends[0].period, "2030");
  assert.ok(Array.isArray(res.limitations) && res.limitations.length > 0);
  assert.equal(res.sourceType, "SYSTEM_DERIVED");
});

test("getCareerTrends for missing career returns limitations, not throw", async () => {
  const res = await getCareerTrends("career_does_not_exist");
  assert.equal(res.career, null);
  assert.ok(res.limitations.includes("The requested career was not found."));
});

// ---------- Service: batch + ranking ----------

test("getTrendsForCareers picks best (latest period) record", async () => {
  const map = await getTrendsForCareers([careerId]);
  const rec = map.get(careerId);
  assert.ok(rec);
  assert.equal(rec.period, "2030");
});

test("ranking is deterministic by trendScore desc", async () => {
  const res = await getTrends({ region: TEST_REGION });
  const scores = res.trends.map((t) => t.trendScore);
  const sorted = [...scores].sort((a, b) => b - a);
  assert.deepEqual(scores, sorted);
});

// ---------- Personalized combining (keep scores separate) ----------

test("buildPersonalizedTrending keeps matchScore and trendScore separate", () => {
  const matches = [
    {
      careerId,
      career: {
        id: careerId,
        name: "Test",
        slug: "test",
        title: "Test",
        category: "Technology",
        shortDescription: null,
        demandLevel: "HIGH",
        salaryEntry: "0",
        isEmerging: false,
      },
      matchScore: 75,
      confidenceScore: 80,
    },
  ];
  const trendRecord = {
    id: "t1",
    careerId,
    period: "2030",
    region: TEST_REGION,
    trendScore: 80,
    demandIndicator: "HIGH",
    growthIndicator: "+40%",
    trending: true,
    emerging: false,
    fastGrowing: true,
    futureFacing: false,
    source: "SYSTEM_DERIVED",
    sourceUrl: null,
    methodology: null,
    recordedAt: new Date(),
    updatedAt: new Date(),
    career: {
      id: careerId,
      name: "Test",
      slug: "test",
      title: "Test",
      category: "Technology",
      subcategory: null,
      shortDescription: null,
      demandLevel: "HIGH",
      jobGrowth: "+40%",
      isEmerging: false,
    },
  };
  const map = new Map([[careerId, trendRecord]]);
  const res = buildPersonalizedTrending(matches, map, "foryou");
  const item = res.items[0];
  assert.equal(item.matchScore, 75);
  assert.equal(item.trendScore, 80);
  assert.notEqual(item.matchScore, item.trendScore);
  assert.equal(item.isRecommended, true);
  assert.ok(item.classifications.includes("FAST_GROWING"));
});

// ---------- Data quality ----------

test("every trend record references an existing career (no orphans)", async () => {
  const careers = await prisma.career.findMany({ select: { id: true } });
  const ids = new Set(careers.map((c) => c.id));
  const trends = await prisma.careerTrend.findMany({ select: { careerId: true } });
  const orphans = trends.filter((t) => !ids.has(t.careerId));
  assert.equal(orphans.length, 0);
});

test("unique constraint prevents duplicate trend record per career/period/region/source", async () => {
  const base = {
    careerId,
    period: "2031",
    region: TEST_REGION,
    source: "SYSTEM_DERIVED",
  };
  await prisma.careerTrend.create({ data: { ...base, trendScore: 10 } });
  await assert.rejects(
    prisma.careerTrend.create({ data: { ...base, trendScore: 20 } }),
    /Unique constraint|unique/i
  );
  await prisma.careerTrend.deleteMany({ where: base });
});
