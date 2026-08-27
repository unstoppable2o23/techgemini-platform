import { cn } from "@/lib/utils";
import {
  getMatchTone,
  matchLabel,
  confidenceLabel,
  MATCH_TONE_CLASSES,
  type MatchTone,
} from "@/lib/match-presentation";
import type { LucideIcon } from "lucide-react";

export function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  action,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon className="h-4 w-4" />
            </span>
          )}
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function MatchPill({ score }: { score: number | null | undefined }) {
  const tone: MatchTone = getMatchTone(score);
  const c = MATCH_TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        c.pill
      )}
      title={`${Math.round(Number(score) || 0)}% alignment with your profile`}
    >
      <span className="font-bold">{Math.round(Number(score) || 0)}%</span>
      {matchLabel(score)}
    </span>
  );
}

export function ConfidencePill({ confidence }: { confidence: number | null | undefined }) {
  const c = confidenceLabel(confidence);
  const tone: MatchTone =
    c === "High confidence" ? "strong" : c === "Moderate confidence" ? "good" : "explore";
  const cls = MATCH_TONE_CLASSES[tone].pill;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", cls)}>
      {c}
    </span>
  );
}

const PATHWAY_STYLES: Record<string, { label: string; cls: string }> = {
  PRIMARY: { label: "Recommended", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ALTERNATIVE: { label: "Alternative", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  OPTIONAL: { label: "Optional", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function PathwayBadge({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const s = PATHWAY_STYLES[priority] ?? PATHWAY_STYLES.OPTIONAL;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", s.cls)}>
      {s.label}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const tone = MATCH_TONE_CLASSES[getMatchTone(v)];
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(226 232 240)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className={cn("text-accent transition-[stroke-dashoffset] duration-700", tone.ring)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-bold leading-none text-foreground">{label ?? `${Math.round(v)}%`}</span>
        {sublabel && <span className="mt-0.5 text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
