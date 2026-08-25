import type { LucideIcon } from "lucide-react";

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageHeader({ icon: Icon, title, description, actions, children, eyebrow }: PageHeaderProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/20 p-6 sm:p-8 text-white shadow-xl"
      style={{
        background:
          "linear-gradient(125deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 45%, hsl(var(--accent)) 100%)",
      }}
    >
      {/* soft glow orb behind the icon */}
      <div
        className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full opacity-25 blur-2xl"
        style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }}
      />
      {/* highlight wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 82% 12%, rgba(255,255,255,0.22) 0%, transparent 42%)",
        }}
      />
      {/* bottom-right blurred orb */}
      <div className="pointer-events-none absolute -bottom-20 -right-14 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      {/* subtle dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* thin gradient rule on top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-white/0 via-white/60 to-white/0" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 shadow-lg backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            {eyebrow && (
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-bold tracking-tight sm:text-[1.65rem]">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-white/80">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}