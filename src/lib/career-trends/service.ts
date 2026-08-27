import { prisma } from "../prisma.ts";
import type {
  DemandIndicator,
  PersonalizedTrendItem,
  TrendCareerSummary,
  TrendClassification,
  TrendDetailResult,
  TrendListResult,
  TrendQuery,
  TrendRecord,
  TrendSource,
  TrendType,
} from "./types.ts";
import {
  CURRENT_PERIOD,
  DEFAULT_REGION,
  GLOBAL_LIMITATION,
  NO_TREND_LIMITATIONS,
  SYSTEM_DERIVED_LIMITATIONS,
  SYSTEM_DERIVED_METHODOLOGY,
  sourceWeight,
} from "./config.ts";
import { rankTrends, rankPersonalized } from "./ranking.ts";

type CareerTrendRow = {
  id: string;
  careerId: string;
  period: string;
  region: string;
  trendScore: number;
  demandIndicator: string | null;
  growthIndicator: string | null;
  trending: boolean;
  emerging: boolean;
  fastGrowing: boolean;
  futureFacing: boolean;
  source: string;
  sourceUrl: string | null;
  methodology: string | null;
  recordedAt: Date;
  updatedAt: Date;
};

const CAREER_SELECT = {
  id: true,
  name: true,
  slug: true,
  title: true,
  category: true,
  subcategory: true,
  shortDescription: true,
  demandLevel: true,
  jobGrowth: true,
  isEmerging: true,
} as const;

type CareerRow = {
  id: string;
  name: string;
  slug: string;
  title: string;
  category: string | null;
  subcategory: string | null;
  shortDescription: string | null;
  demandLevel: string;
  jobGrowth: string;
  isEmerging: boolean;
};

function summarizeCareer(c: CareerRow): TrendCareerSummary {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    title: c.title,
    category: c.category,
    subcategory: c.subcategory,
    shortDescription: c.shortDescription,
    demandLevel: c.demandLevel,
    jobGrowth: c.jobGrowth,
    isEmerging: c.isEmerging,
  };
}

function classificationsFromRecord(record: {
  trending: boolean;
  emerging: boolean;
  fastGrowing: boolean;
  futureFacing: boolean;
}): TrendClassification[] {
  const list: TrendClassification[] = [];
  if (record.emerging) list.push("EMERGING");
  if (record.fastGrowing) list.push("FAST_GROWING");
  if (record.futureFacing) list.push("FUTURE");
  if (record.trending) list.push("TRENDING");
  return list;
}

function buildTrendRecord(row: CareerTrendRow, career: CareerRow): TrendRecord {
  return {
    id: row.id,
    careerId: row.careerId,
    period: row.period,
    region: row.region,
    trendScore: row.trendScore,
    demandIndicator: (row.demandIndicator as DemandIndicator) ?? null,
    growthIndicator: row.growthIndicator,
    trending: row.trending,
    emerging: row.emerging,
    fastGrowing: row.fastGrowing,
    futureFacing: row.futureFacing,
    source: row.source as TrendSource,
    sourceUrl: row.sourceUrl,
    methodology: row.methodology,
    recordedAt: row.recordedAt,
    updatedAt: row.updatedAt,
    career: summarizeCareer(career),
  };
}

function pickBestRecord(records: TrendRecord[]): TrendRecord | null {
  if (records.length === 0) return null;
  return [...records].sort((a, b) => {
    if (b.period !== a.period) return b.period.localeCompare(a.period);
    return sourceWeight(b.source) - sourceWeight(a.source);
  })[0];
}

async function loadCareers(
  careerIds: string[]
): Promise<Map<string, CareerRow>> {
  if (careerIds.length === 0) return new Map();
  const careers = (await prisma.career.findMany({
    where: { id: { in: careerIds } },
    select: CAREER_SELECT,
  })) as CareerRow[];
  return new Map(careers.map((c) => [c.id, c]));
}

function typeFilterWhere(type: TrendType | null | undefined) {
  if (!type) return {};
  switch (type) {
    case "trending":
      return { trending: true };
    case "emerging":
      return { emerging: true };
    case "fast-growing":
      return { fastGrowing: true };
    case "future":
      return { futureFacing: true };
    default:
      return {};
  }
}

/**
 * Lists careers by trend classification with category/region/period filters.
 * Trend data is kept independent of the Phase 4 career match score.
 */
export async function getTrends(
  query: TrendQuery = {}
): Promise<TrendListResult> {
  const type = query.type ?? null;
  const limit = Math.min(Math.max(query.limit ?? 12, 1), 100);
  const page = Math.max(query.page ?? 1, 1);
  const region = query.region ?? null;
  const period = query.period ?? null;

  const where: Record<string, unknown> = {
    ...typeFilterWhere(type),
  };
  if (region) where.region = region;
  if (period) where.period = period;

  const rows = (await prisma.careerTrend.findMany({
    where,
    orderBy: [{ period: "desc" }, { trendScore: "desc" }],
  })) as CareerTrendRow[];

  const careers = await loadCareers(rows.map((r) => r.careerId));
  let records: TrendRecord[] = [];
  for (const row of rows) {
    const career = careers.get(row.careerId);
    if (!career) continue;
    records.push(buildTrendRecord(row, career));
  }

  if (query.category) {
    const cat = query.category.toLowerCase();
    records = records.filter(
      (r) => (r.career.category ?? "").toLowerCase() === cat
    );
  }

  records = rankTrends(records);

  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paged = records.slice(start, start + limit);

  return {
    type,
    category: query.category ?? null,
    region,
    period,
    trends: paged,
    total,
    page,
    totalPages,
  };
}

/**
 * Gets trend detail for a single career. Returns limitations instead of errors
 * when no trend data exists, so the UI can degrade gracefully.
 */
export async function getCareerTrends(
  careerId: string
): Promise<TrendDetailResult> {
  const career = (await prisma.career.findUnique({
    where: { id: careerId },
    select: CAREER_SELECT,
  })) as CareerRow | null;

  if (!career) {
    return {
      career: null,
      trends: [],
      classifications: [],
      sourceType: null,
      methodology: null,
      limitations: ["The requested career was not found."],
    };
  }

  const rows = (await prisma.careerTrend.findMany({
    where: { careerId },
    orderBy: [{ period: "desc" }, { trendScore: "desc" }],
  })) as CareerTrendRow[];

  const records = rows.map((row) => buildTrendRecord(row, career));
  const classifications = new Set<TrendClassification>();
  for (const r of records) {
    for (const c of classificationsFromRecord(r)) classifications.add(c);
  }

  const best = pickBestRecord(records);
  const limitations = records.length
    ? [...SYSTEM_DERIVED_LIMITATIONS]
    : [...NO_TREND_LIMITATIONS];
  if (best && best.region === DEFAULT_REGION) {
    limitations.push(GLOBAL_LIMITATION);
  }

  return {
    career: summarizeCareer(career),
    trends: records,
    classifications: [...classifications],
    sourceType: (best?.source as TrendSource) ?? null,
    methodology: best?.methodology ?? SYSTEM_DERIVED_METHODOLOGY,
    limitations,
  };
}

/**
 * Batch-loads the best trend record per career. Used to enrich personalized
 * matches without duplicating the Phase 4 scoring logic.
 */
export async function getTrendsForCareers(
  careerIds: string[]
): Promise<Map<string, TrendRecord>> {
  const map = new Map<string, TrendRecord>();
  if (careerIds.length === 0) return map;

  const rows = (await prisma.careerTrend.findMany({
    where: { careerId: { in: careerIds } },
  })) as CareerTrendRow[];

  const careers = await loadCareers(careerIds);
  const byCareer = new Map<string, TrendRecord[]>();
  for (const row of rows) {
    const career = careers.get(row.careerId);
    if (!career) continue;
    const record = buildTrendRecord(row, career);
    const list = byCareer.get(row.careerId) ?? [];
    list.push(record);
    byCareer.set(row.careerId, list);
  }

  for (const [careerId, list] of byCareer.entries()) {
    const best = pickBestRecord(list);
    if (best) map.set(careerId, best);
  }
  return map;
}

type MatchLike = {
  careerId: string;
  career: {
    id: string;
    name: string;
    slug: string;
    title: string;
    category: string | null;
    shortDescription: string | null;
    demandLevel: string;
    salaryEntry: string;
    isEmerging: boolean;
  };
  matchScore: number;
  confidenceScore: number;
};

/**
 * Combines Phase 4 matches with trend data. The matchScore and trendScore are
 * kept as separate, independently meaningful values; they are never summed.
 * "isRecommended" is driven by the match score, not the trend score.
 */
export function buildPersonalizedTrending(
  matches: MatchLike[],
  trendsMap: Map<string, TrendRecord>,
  view: "foryou" | "trending" = "foryou"
): {
  items: PersonalizedTrendItem[];
  total: number;
  limitations: string[];
} {
  const items: PersonalizedTrendItem[] = matches.map((m) => {
    const trend = trendsMap.get(m.careerId) ?? null;
    return {
      careerId: m.careerId,
      career: {
        id: m.career.id,
        name: m.career.name,
        slug: m.career.slug,
        title: m.career.title,
        category: m.career.category,
        subcategory: null,
        shortDescription: m.career.shortDescription,
        demandLevel: m.career.demandLevel,
        jobGrowth: "",
        isEmerging: m.career.isEmerging,
      },
      matchScore: m.matchScore,
      confidenceScore: m.confidenceScore,
      trendScore: trend ? trend.trendScore : null,
      classifications: trend ? classificationsFromRecord(trend) : [],
      demandIndicator: trend ? trend.demandIndicator : null,
      growthIndicator: trend ? trend.growthIndicator : null,
      source: trend ? trend.source : null,
      isRecommended: m.matchScore >= 60,
    };
  });

  const ranked = rankPersonalized(items, view);
  return {
    items: ranked,
    total: ranked.length,
    limitations: [...SYSTEM_DERIVED_LIMITATIONS],
  };
}

export { CURRENT_PERIOD, DEFAULT_REGION };
