import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CURRENT_PERIOD = new Date().getFullYear().toString();
const REGION = "GLOBAL";
const SOURCE = "SYSTEM_DERIVED";
const METHODOLOGY =
  "Trend classification is derived from existing career metadata (demandLevel, jobGrowth, isEmerging, futureOutlook). It is a system-derived signal, not verified external market data, and does not guarantee future employment or salary outcomes.";

function normalizeDemandLevel(value) {
  if (typeof value !== "string") return "UNKNOWN";
  const v = value.trim().toUpperCase();
  if (v === "HIGH" || v === "H" || v === "STRONG") return "HIGH";
  if (v === "MEDIUM" || v === "MED" || v === "MODERATE" || v === "M") return "MEDIUM";
  if (v === "LOW" || v === "L" || v === "WEAK") return "LOW";
  return "UNKNOWN";
}

function parseGrowthPercent(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isNaN(n) ? null : n;
}

function growthScore(jobGrowth) {
  const pct = parseGrowthPercent(jobGrowth);
  if (pct === null) return 50;
  return Math.max(0, Math.min(100, pct));
}

function demandScore(demandLevel) {
  const i = normalizeDemandLevel(demandLevel);
  if (i === "HIGH") return 100;
  if (i === "MEDIUM") return 60;
  if (i === "LOW") return 30;
  return 50;
}

function futureScore(futureOutlook) {
  return typeof futureOutlook === "string" && futureOutlook.trim().length > 0
    ? 80
    : 50;
}

function computeTrendScore({ demandLevel, jobGrowth, isEmerging, futureOutlook }) {
  const d = demandScore(demandLevel);
  const g = growthScore(jobGrowth);
  const e = isEmerging ? 100 : 0;
  const f = futureScore(futureOutlook);
  const raw = 0.4 * d + 0.3 * g + 0.15 * e + 0.15 * f;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

async function main() {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: {
      id: true,
      demandLevel: true,
      jobGrowth: true,
      isEmerging: true,
      futureOutlook: true,
    },
  });

  let created = 0;
  let updated = 0;

  for (const c of careers) {
    const demand = normalizeDemandLevel(c.demandLevel);
    const g = growthScore(c.jobGrowth);
    const emerging = Boolean(c.isEmerging);
    const futureFacing =
      demand === "HIGH" ||
      (typeof c.futureOutlook === "string" && c.futureOutlook.trim().length > 0);
    const fastGrowing = g >= 35;
    const trending =
      demand === "HIGH" && (emerging || fastGrowing || futureFacing);
    const trendScore = computeTrendScore({
      demandLevel: c.demandLevel,
      jobGrowth: c.jobGrowth,
      isEmerging: emerging,
      futureOutlook: c.futureOutlook,
    });

    const data = {
      period: CURRENT_PERIOD,
      region: REGION,
      trendScore,
      demandIndicator: demand,
      growthIndicator: typeof c.jobGrowth === "string" ? c.jobGrowth : null,
      trending,
      emerging,
      fastGrowing,
      futureFacing,
      source: SOURCE,
      methodology: METHODOLOGY,
    };

    const existing = await prisma.careerTrend.findUnique({
      where: {
        careerId_period_region_source: {
          careerId: c.id,
          period: CURRENT_PERIOD,
          region: REGION,
          source: SOURCE,
        },
      },
    });

    if (existing) {
      await prisma.careerTrend.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.careerTrend.create({ data: { ...data, careerId: c.id } });
      created += 1;
    }
  }

  console.log(
    `Career trends seeded: ${created} created, ${updated} updated, ${careers.length} careers processed (period ${CURRENT_PERIOD}).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
