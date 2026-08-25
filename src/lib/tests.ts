import streamBank from "@/data/stream-selector.json";
import idealBank from "@/data/ideal-career.json";
import personalityBank from "@/data/personality.json";
import intelligencesBank from "@/data/intelligences.json";
import learningBank from "@/data/learning-productivity.json";

export type TestKind = "stream" | "ideal" | "personality" | "intelligences" | "learning";

export type RawOption = {
  id: number;
  answer: string;
  marks: number;
  media_path?: string;
  pole?: string;
};

export type RawQuestion = {
  id: number;
  question: string;
  domain_id: number;
  subdomain_id: string;
  questionformat?: number;
  mediatype?: number;
  media_path?: string;
  options: Record<string, RawOption>;
};

export const STREAM_QUESTIONS = streamBank as unknown as Record<string, RawQuestion>;
export const IDEAL_QUESTIONS = idealBank as unknown as Record<string, RawQuestion>;
export const PERSONALITY_QUESTIONS = personalityBank as unknown as Record<
  string,
  RawQuestion
>;
export const INTELLIGENCES_QUESTIONS = intelligencesBank as unknown as Record<
  string,
  RawQuestion
>;
export const LEARNING_QUESTIONS = learningBank as unknown as Record<
  string,
  RawQuestion
>;

export function questionsFor(kind: TestKind): Record<string, RawQuestion> {
  if (kind === "stream") return STREAM_QUESTIONS;
  if (kind === "ideal") return IDEAL_QUESTIONS;
  if (kind === "personality") return PERSONALITY_QUESTIONS;
  return INTELLIGENCES_QUESTIONS;
}

export type StudentRef = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

function slugify(name: string): string {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function tokenFor(student: string, kind: TestKind): string {
  return `${kind === "stream" ? "STREAM" : "IDEAL"}-${slugify(student)}`;
}

export function tokenForStudent(
  student: Pick<StudentRef, "id" | "firstName" | "lastName">,
  kind: TestKind
): string {
  const name = `${student.firstName} ${student.lastName}`;
  const prefix =
    kind === "stream"
      ? "STREAM"
      : kind === "ideal"
        ? "IDEAL"
        : kind === "personality"
          ? "PERSONALITY"
          : kind === "intelligences"
            ? "INTELLIGENCE"
            : "LEARNING";
  return `${prefix}-${slugify(name)}-${student.id.slice(-6).toUpperCase()}`;
}

export function kindForToken(token: string): TestKind | null {
  const t = decodeURIComponent(token).toUpperCase();
  if (t.startsWith("STREAM")) return "stream";
  if (t.startsWith("IDEAL")) return "ideal";
  if (t.startsWith("PERSONALITY")) return "personality";
  if (t.startsWith("INTELLIGENCE")) return "intelligences";
  if (t.startsWith("LEARNING")) return "learning";
  return null;
}

export const KIND_LABELS: Record<TestKind, string> = {
  stream: "Stream Selector",
  ideal: "Ideal Career",
  personality: "Personality Type Profile",
  intelligences: "Multiple Intelligences",
  learning: "Learning & Productivity",
};

export function orderedOptions(q: RawQuestion): RawOption[] {
  return Object.values(q.options ?? {}).sort((a, b) => Number(a.id) - Number(b.id));
}

export type ScoreRow = { key: string; label: string; score: number; max: number };

export type StreamReport = {
  kind: "stream";
  rows: ScoreRow[];
  recommendedStream: string;
};

export type IdealReport = {
  kind: "ideal";
  domains: ScoreRow[];
  strengths: { label: string; pct: number }[];
};

export type PersonalityRow = {
  key: string;
  first: { label: string; count: number };
  second: { label: string; count: number };
};

export type PersonalityReport = {
  kind: "personality";
  type: string;
  rows: PersonalityRow[];
};

export type IntelligenceRow = {
  key: string;
  label: string;
  score: number;
  max: number;
};

export type IntelligencesReport = {
  kind: "intelligences";
  rows: IntelligenceRow[];
  emotionalIntelligence: number;
};

export type LearningGroup = {
  name: string;
  rows: { abbrev: string; label: string; score: number }[];
};

export type LearningReport = {
  kind: "learning";
  groups: LearningGroup[];
};

export type ExamReport =
  | StreamReport
  | IdealReport
  | PersonalityReport
  | IntelligencesReport
  | LearningReport;

const LEARNING_DIMENSIONS: Record<string, string> = {
  VIS: "Visual",
  AUD: "Auditory",
  TAC: "Tactile",
  KIN: "Kinesthetic",
  SND: "Sound (need for quiet)",
  DES: "Setting (formal vs informal)",
  LHT: "Light",
  TMP: "Temperature",
  ITK: "Intake (eating/drinking)",
  MOB: "Mobility",
  TIM: "Time of Day",
  ALN: "Collaborative vs Independent",
  STR: "Structure",
  PER: "Focus & Persistence",
  TCR: "Teacher Motivation",
  MOT: "Self-Motivation",
};

const LEARNING_GROUPS: { name: string; dims: string[] }[] = [
  { name: "Sensory Preferences", dims: ["VIS", "AUD", "TAC", "KIN"] },
  {
    name: "Environmental Preferences",
    dims: ["SND", "DES", "LHT", "TMP", "ITK", "MOB", "TIM"],
  },
  {
    name: "Mindset Preferences",
    dims: ["ALN", "STR", "PER", "TCR", "MOT"],
  },
];

const PERSONALITY_DIMENSIONS: Record<number, [string, string]> = {
  1: ["Extraversion", "Introversion"],
  2: ["Sensing", "Intuition"],
  3: ["Thinking", "Feeling"],
  4: ["Judging", "Perceiving"],
};

const INTELLIGENCE_LABELS: Record<number, string> = {
  1: "Bodily-Kinesthetic",
  2: "Visual-Spatial",
  3: "Linguistic",
  4: "Logical-Mathematical",
  5: "Musical",
  6: "Interpersonal",
  7: "Intrapersonal",
  8: "Naturalist",
  9: "Existential",
};

const STREAM_LABELS: Record<string, string> = {
  "1": "Humanities",
  "2": "Science",
  "3": "Commerce",
  "4": "Arts",
};

const IDEAL_DOMAINS: Record<number, string> = {
  166: "Self Identification",
  167: "Work Situations",
  168: "Incomplete Sequence",
  169: "Identical Codes",
  170: "Logical Scenarios",
  171: "Important Factor",
  172: "Situational Exploration",
};

const STREAM_DOMAINS: Record<number, { label: string; intro?: string }> = {
  173: {
    label: "Like / Dislike",
    intro:
      "This first section is about your personal tastes. For each activity or interest, simply pick how much it appeals to you — there are no right or wrong answers.",
  },
  174: {
    label: "Work Situations",
    intro:
      "Picture yourself doing each job below as your full-time work. Choose how much you think you would enjoy earning your living that way.",
  },
  175: {
    label: "Understanding Situations",
    intro:
      "This section tests how carefully you can compare information. Read each puzzle, study the details given, and pick the answer that fits.",
  },
  176: {
    label: "Important Information",
    intro:
      "Every question here contains everything you need — no outside knowledge required. Read each one closely and choose the answer that follows from the information given.",
  },
  177: {
    label: "Careful Reasoning",
    intro:
      "Each item makes a claim. Decide whether it is clearly true, clearly false, or whether it cannot be judged from what you know.",
  },
  178: { label: "Words Game" },
  179: {
    label: "Incomplete Sequence",
    intro:
      "Look at the pattern in each question and work out which option continues it.",
  },
};

export const DOMAIN_META: Record<TestKind, Record<number, { label: string; intro?: string }>> = {
  stream: STREAM_DOMAINS,
  ideal: Object.fromEntries(
    Object.entries(IDEAL_DOMAINS).map(([id, label]) => [id, { label }])
  ),
  intelligences: {
    1: { label: "Bodily-Kinesthetic" },
    2: { label: "Visual-Spatial" },
    3: { label: "Linguistic" },
    4: { label: "Logical-Mathematical" },
    5: { label: "Musical" },
    6: { label: "Interpersonal" },
    7: { label: "Intrapersonal" },
    8: { label: "Naturalist" },
    9: { label: "Existential" },
  },
  learning: {
    1: {
      label: "Sensory Preferences",
      intro:
        "How you prefer to take in information — by seeing, hearing, touching or doing.",
    },
    2: {
      label: "Environmental Preferences",
      intro:
        "The study surroundings that help you focus — sound, light, temperature, seating, snacks and time of day.",
    },
    3: {
      label: "Mindset Preferences",
      intro:
        "Your attitude toward learning — motivation, structure, persistence and who you study with.",
    },
  },
  personality: {
    1: {
      label: "Extraversion or Introversion",
      intro:
        "Read both statements and choose the one that sounds more like you — how you get energy and interact with the world.",
    },
    2: {
      label: "Sensing or Intuition",
      intro:
        "Choose the statement that sounds more like you — how you take in information and learn new things.",
    },
    3: {
      label: "Thinking or Feeling",
      intro:
        "Choose the statement that sounds more like you — how you make decisions.",
    },
    4: {
      label: "Judging or Perceiving",
      intro:
        "Choose the statement that sounds more like you — how you approach work, schedules and plans.",
    },
  },
};

export function buildReport(
  kind: TestKind,
  answers: Record<string, string>
): ExamReport {
  const bank = questionsFor(kind);

  if (kind === "intelligences") {
    const totals: Record<number, number> = {};
    for (const q of Object.values(bank)) {
      const d = Number(q.domain_id);
      const chosen = answers[String(q.id)];
      if (!chosen) continue;
      const opt = Object.values(q.options).find((o) => String(o.id) === String(chosen));
      if (opt) totals[d] = (totals[d] || 0) + opt.marks;
    }
    const rows: IntelligenceRow[] = Object.keys(INTELLIGENCE_LABELS)
      .map(Number)
      .map((d) => ({
        key: String(d),
        label: INTELLIGENCE_LABELS[d],
        score: totals[d] || 0,
        max: 42,
      }))
      .sort((a, b) => b.score - a.score);
    const interpersonal = totals[6] || 0;
    const intrapersonal = totals[7] || 0;
    return {
      kind: "intelligences",
      rows,
      emotionalIntelligence: Math.round(((interpersonal + intrapersonal) / 2) * 10) / 10,
    };
  }

  if (kind === "learning") {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const q of Object.values(bank)) {
      const dim = String(q.subdomain_id);
      const chosen = answers[String(q.id)];
      if (!chosen) continue;
      const opt = Object.values(q.options).find((o) => String(o.id) === String(chosen));
      if (!opt) continue;
      const pol = (q as { polarity?: number }).polarity === 0 ? 6 - opt.marks : opt.marks;
      sums[dim] = sums[dim] || { total: 0, count: 0 };
      sums[dim].total += pol;
      sums[dim].count += 1;
    }
    const scoreOf = (dim: string) => {
      const s = sums[dim];
      if (!s || s.count === 0) return 50;
      return Math.round(((s.total / s.count - 1) / 4) * 1000) / 10;
    };
    const groups: LearningGroup[] = LEARNING_GROUPS.map((g) => ({
      name: g.name,
      rows: g.dims.map((d) => ({
        abbrev: d,
        label: LEARNING_DIMENSIONS[d],
        score: scoreOf(d),
      })),
    }));
    return { kind: "learning", groups };
  }

  if (kind === "personality") {
    const firstCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const secondCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const q of Object.values(bank)) {
      const d = Number(q.domain_id);
      const chosen = answers[String(q.id)];
      if (!chosen) continue;
      const opt = Object.values(q.options).find((o) => String(o.id) === String(chosen));
      if (!opt) continue;
      if (opt.pole === "E" || opt.pole === "S" || opt.pole === "T" || opt.pole === "J") {
        firstCounts[d] = (firstCounts[d] || 0) + 1;
      } else {
        secondCounts[d] = (secondCounts[d] || 0) + 1;
      }
    }
    let type = "";
    const rows: PersonalityRow[] = [1, 2, 3, 4].map((d) => {
      const [firstLabel, secondLabel] = PERSONALITY_DIMENSIONS[d];
      const first = firstCounts[d] || 0;
      const second = secondCounts[d] || 0;
      type += first >= second ? firstLabel[0] : secondLabel[0];
      return {
        key: String(d),
        first: { label: firstLabel, count: first },
        second: { label: secondLabel, count: second },
      };
    });
    return { kind: "personality", type, rows };
  }

  if (kind === "stream") {
    const totals: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0 };
    const maxes: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0 };
    for (const q of Object.values(bank)) {
      const sd = String(q.subdomain_id);
      maxes[sd] = (maxes[sd] || 0) + Math.max(...orderedOptions(q).map((o) => o.marks));
      const chosen = answers[String(q.id)];
      if (!chosen) continue;
      const opt = Object.values(q.options).find((o) => String(o.id) === String(chosen));
      if (opt) totals[sd] = (totals[sd] || 0) + opt.marks;
    }
    const rows: ScoreRow[] = Object.keys(totals)
      .map((sd) => ({
        key: sd,
        label: STREAM_LABELS[sd] || `Factor ${sd}`,
        score: totals[sd],
        max: maxes[sd],
      }))
      .sort((a, b) => b.score - a.score);
    return { kind: "stream", rows, recommendedStream: rows[0]?.label || "Undecided" };
  }

  const domTotals: Record<number, number> = {};
  const domMaxes: Record<number, number> = {};
  const sdTotals: Record<string, number> = {};
  const sdMaxes: Record<string, number> = {};
  for (const q of Object.values(bank)) {
    const d = Number(q.domain_id);
    const sd = String(q.subdomain_id);
    domMaxes[d] = (domMaxes[d] || 0) + Math.max(...orderedOptions(q).map((o) => o.marks));
    sdMaxes[sd] = (sdMaxes[sd] || 0) + Math.max(...orderedOptions(q).map((o) => o.marks));
    const chosen = answers[String(q.id)];
    if (!chosen) continue;
    const opt = Object.values(q.options).find((o) => String(o.id) === String(chosen));
    if (!opt) continue;
    domTotals[d] = (domTotals[d] || 0) + opt.marks;
    sdTotals[sd] = (sdTotals[sd] || 0) + opt.marks;
  }
  const domains: ScoreRow[] = Object.keys(domMaxes)
    .map(Number)
    .sort((a, b) => a - b)
    .map((d) => ({
      key: String(d),
      label: IDEAL_DOMAINS[d] || `Section ${d}`,
      score: domTotals[d] || 0,
      max: domMaxes[d],
    }));
  const strengths = Object.keys(sdMaxes)
    .map((sd) => ({
      label: sd,
      pct: sdTotals[sd] ? Math.round(((sdTotals[sd] || 0) / sdMaxes[sd]) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)
    .map((s) => ({ label: `Trait ${s.label}`, pct: s.pct }));

  return { kind: "ideal", domains, strengths };
}
