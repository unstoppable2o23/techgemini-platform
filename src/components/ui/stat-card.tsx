import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
};

const ICON_GRADIENTS: Record<string, string> = {
  indigo: "from-primary to-accent",
  teal: "from-primary to-accent",
  amber: "from-primary to-accent",
  rose: "from-primary to-accent",
};

const CHIP_GLOWS: Record<string, string> = {
  indigo: "shadow-primary/25",
  teal: "shadow-primary/25",
  amber: "shadow-primary/25",
  rose: "shadow-primary/25",
};

const VALUE_COLORS: Record<string, string> = {
  indigo: "text-primary",
  teal: "text-primary",
  amber: "text-primary",
  rose: "text-primary",
};

const ACCENT_BARS: Record<string, string> = {
  indigo: "from-primary to-accent",
  teal: "from-primary to-accent",
  amber: "from-primary to-accent",
  rose: "from-primary to-accent",
};

export function StatCard({ title, value, icon: Icon, hint }: StatCardProps) {
  const key = title.match(/student/i)
    ? "indigo"
    : title.match(/test/i)
      ? "amber"
      : title.match(/appointment|university/i)
        ? "teal"
        : title.match(/active|standalone/i)
          ? "rose"
          : "indigo";
  const gradient = ICON_GRADIENTS[key] || ICON_GRADIENTS.indigo;
  const glow = CHIP_GLOWS[key] || CHIP_GLOWS.indigo;
  const valueColor = VALUE_COLORS[key] || VALUE_COLORS.indigo;
  const accentBar = ACCENT_BARS[key] || ACCENT_BARS.indigo;

  return (
    <Card className="group relative overflow-hidden border-border/70 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accentBar} opacity-80`} />
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="pt-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <CardContent className="p-0 pt-1">
            <div className={`text-3xl font-bold tracking-tight ${valueColor}`}>
              {value}
            </div>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </CardContent>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md ${glow} transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}