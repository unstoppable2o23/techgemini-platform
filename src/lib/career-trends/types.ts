export type TrendType = "trending" | "emerging" | "fast-growing" | "future";

export type TrendSource =
  | "OFFICIAL"
  | "PUBLIC_DATA"
  | "EDITORIAL"
  | "SYSTEM_DERIVED"
  | "MANUAL";

export type DemandIndicator = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type TrendClassification =
  | "TRENDING"
  | "EMERGING"
  | "FAST_GROWING"
  | "FUTURE";

export type TrendQuery = {
  type?: TrendType;
  category?: string | null;
  region?: string | null;
  period?: string | null;
  limit?: number;
  page?: number;
};

export type TrendCareerSummary = {
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

export type TrendRecord = {
  id: string;
  careerId: string;
  period: string;
  region: string;
  trendScore: number;
  demandIndicator: DemandIndicator | null;
  growthIndicator: string | null;
  trending: boolean;
  emerging: boolean;
  fastGrowing: boolean;
  futureFacing: boolean;
  source: TrendSource;
  sourceUrl: string | null;
  methodology: string | null;
  recordedAt: Date;
  updatedAt: Date;
  career: TrendCareerSummary;
};

export type TrendListResult = {
  type: TrendType | null;
  category: string | null;
  region: string | null;
  period: string | null;
  trends: TrendRecord[];
  total: number;
  page: number;
  totalPages: number;
};

export type TrendDetailResult = {
  career: TrendCareerSummary | null;
  trends: TrendRecord[];
  classifications: TrendClassification[];
  sourceType: TrendSource | null;
  methodology: string | null;
  limitations: string[];
};

export type PersonalizedTrendItem = {
  careerId: string;
  career: TrendCareerSummary;
  matchScore: number;
  confidenceScore: number;
  trendScore: number | null;
  classifications: TrendClassification[];
  demandIndicator: DemandIndicator | null;
  growthIndicator: string | null;
  source: TrendSource | null;
  isRecommended: boolean;
};

export type PersonalizedTrendResult = {
  view: "foryou" | "trending";
  items: PersonalizedTrendItem[];
  total: number;
  sourceType: TrendSource | null;
  limitations: string[];
  disclaimer: string | null;
};

export function isTrendType(value: unknown): value is TrendType {
  return (
    value === "trending" ||
    value === "emerging" ||
    value === "fast-growing" ||
    value === "future"
  );
}
