"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building2,
  BookmarkPlus,
  MessagesSquare,
  User,
  ClipboardList,
  TrendingUp,
  Info,
  Compass,
} from "lucide-react";

/**
 * An interactive, fully synthetic walkthrough of the TechGemini student journey,
 * intended for a salesperson/institution demo. Every step is deterministic sample
 * data. No real student information is used and nothing is written to a database.
 *
 * Journey: Onboarding -> Assessment -> Results -> Careers -> Programs ->
 *          Universities -> Shortlist -> Counselor CTA
 */

const STEPS = [
  { id: "onboarding", label: "Onboarding" },
  { id: "assessment", label: "Assessment" },
  { id: "results", label: "Results" },
  { id: "careers", label: "Careers" },
  { id: "programs", label: "Programs" },
  { id: "universities", label: "Universities" },
  { id: "shortlist", label: "Shortlist" },
  { id: "consult", label: "Counselor" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// Deterministic synthetic demo data (no real students).
const demoCareers = [
  {
    name: "Data Scientist",
    match: 84,
    tier: "Strong Match",
    why: ["Mathematics & statistics strength", "Analytics-heavy study stream", "Selected as a preference"],
  },
  {
    name: "Business Analyst",
    match: 76,
    tier: "Moderate Match",
    why: ["Data handling + communication balance", "Interest in decision-making contexts"],
  },
  {
    name: "UX Researcher",
    match: 68,
    tier: "Potential Match",
    why: ["Empathetic, people-oriented profile", "Interest in design & human behaviour"],
  },
];

const demoPrograms = [
  "B.Tech Computer Science",
  "B.Sc Statistics & Data Science",
  "BBA Business Analytics",
  "B.Des Communication Design",
];

const demoUniversities = [
  { name: "Sample Institute of Technology A", type: "Engineering college", state: "Maharashtra" },
  { name: "Sample College of Science B", type: "Science college", state: "Karnataka" },
];

export default function DemoWalkthrough() {
  const [stepIndex, setStepIndex] = useState(0);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const step: StepId = STEPS[stepIndex].id;

  const go = (i: number) => setStepIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
  const last = stepIndex === STEPS.length - 1;

  const toggleShortlist = (name: string) => {
    setShortlist((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  };

  return (
    <div className="space-y-5">
      {/* Synthetic banner */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Interactive sample.</strong> This walkthrough uses synthetic, repeatable example
          data so a demo is always consistent. It references no real student and writes nothing.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            disabled
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              i === stepIndex
                ? "bg-blue-600 text-white"
                : i < stepIndex
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {step === "onboarding" && <Onboarding />}
        {step === "assessment" && <Assessment />}
        {step === "results" && <Results />}
        {step === "careers" && <Careers shortlist={shortlist} onToggle={toggleShortlist} />}
        {step === "programs" && <Programs />}
        {step === "universities" && <Universities />}
        {step === "shortlist" && <ShortlistView shortlist={shortlist} />}
        {step === "consult" && <Consult />}
      </div>

      {/* Step controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => go(stepIndex - 1)}
          disabled={stepIndex === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {!last ? (
          <button
            onClick={() => go(stepIndex + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => go(0)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Restart demo
          </button>
        )}
      </div>

      <p className="px-2 text-center text-xs text-slate-500">
        Sample data shown for demonstration. Recommendations are directional guidance, not a
        guarantee of any career outcome or admission.
      </p>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Compass; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-600" />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</p>
    </div>
  );
}

function Onboarding() {
  return (
    <div>
      <SectionTitle icon={User}>Step 1 — Student onboarding (sample)</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        A student shares academics, subjects, interests and study goals. This drives the
        recommendations that follow.
      </p>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {[
          ["Grade / study level", "Grade 12 (Science stream)"],
          ["Average grade", "High (approx. 85/100)"],
          ["Subjects", "Mathematics, Physics, Chemistry, English"],
          ["Career interest", "Data and technology"],
          ["Study goal", "Explore programs + universities"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
            <span className="text-slate-500">{k}</span>
            <span className="text-right font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Assessment() {
  return (
    <div>
      <SectionTitle icon={ClipboardList}>Step 2 — Assessment (optional, sample)</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        Optional psychometric assessments enrich the recommendations. Here the sample student
        completed the stream and intelligences assessments.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700">
          Stream assessment — completed
        </span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700">
          Intelligences — completed
        </span>
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-500">
          Personality — not yet
        </span>
      </div>
    </div>
  );
}

function Results() {
  return (
    <div>
      <SectionTitle icon={TrendingUp}>Step 3 — Results</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        The sample results give a quick read on suitability, with simple reasons for each match.
      </p>
      <div className="mt-4 space-y-3">
        {demoCareers.map((c, i) => (
          <div key={c.name} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">#{i + 1} {c.name}</p>
                <p className="text-xs text-slate-500">{c.tier}</p>
              </div>
              <span className="text-xl font-bold text-blue-600">{c.match}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Careers({ shortlist, onToggle }: { shortlist: string[]; onToggle: (name: string) => void }) {
  return (
    <div>
      <SectionTitle icon={Compass}>Step 4 — Career details</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        Each career explains why it fits and what to develop. A student can shortlist the ones that
        resonate.
      </p>
      <div className="mt-4 space-y-3">
        {demoCareers.map((c) => (
          <div key={c.name} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-slate-500">{c.tier}</p>
              </div>
              <button
                onClick={() => onToggle(c.name)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  shortlist.includes(c.name)
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 text-slate-600"
                }`}
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                {shortlist.includes(c.name) ? "Shortlisted" : "Shortlist"}
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Why this fits
            </p>
            <ul className="mt-1 space-y-1">
              {c.why.map((w) => (
                <li key={w} className="flex items-start gap-1.5 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Programs() {
  return (
    <div>
      <SectionTitle icon={GraduationCap}>Step 5 — Education pathways</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        Degrees and specializations that prepare students for the careers they&apos;re exploring.
      </p>
      <ul className="mt-4 space-y-2">
        {demoPrograms.map((p) => (
          <li key={p} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium">
            <GraduationCap className="h-4 w-4 text-blue-600" /> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Universities() {
  return (
    <div>
      <SectionTitle icon={Building2}>Step 6 — University options</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        Institutions whose programs align with the student&apos;s chosen direction.
      </p>
      <div className="mt-4 space-y-3">
        {demoUniversities.map((u) => (
          <div key={u.name} className="rounded-xl border border-slate-200 p-4">
            <p className="font-medium">{u.name}</p>
            <p className="text-xs text-slate-500">{u.type} · {u.state}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        University recommendations describe how well an institution fits a profile — not admission
        chance.
      </p>
    </div>
  );
}

function ShortlistView({ shortlist }: { shortlist: string[] }) {
  return (
    <div>
      <SectionTitle icon={BookmarkPlus}>Step 7 — Shortlist</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        The student&apos;s shortlisted careers carry through to a shareable plan.
      </p>
      {shortlist.length === 0 ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          No careers shortlisted yet. Use <em>Back</em> to shortlist from the Careers step.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {shortlist.map((n) => (
            <li key={n} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Consult() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
      <SectionTitle icon={MessagesSquare}>Step 8 — Next step with a counselor</SectionTitle>
      <p className="mt-2 text-sm text-slate-700">
        A student can book a counseling session, request a counselor review, or message their
        counselor to discuss matches. This is the conversion step.
      </p>
      <div className="mt-4">
        <a
          href="/auth/register"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Try it with your own profile <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}