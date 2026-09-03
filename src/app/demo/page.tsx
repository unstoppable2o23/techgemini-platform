import Link from "next/link";
import type { Metadata } from "next";
import {
  User,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building2,
  ArrowRight,
  MessagesSquare,
  Info,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sample Student Report | TechGemini",
  description:
    "A synthetic, clearly-labelled example showing how a student report is structured.",
};

const sampleCareers = [
  {
    name: "Data Scientist",
    match: 84,
    tier: "Strong Match",
    why: [
      "Strong interest and performance in mathematics and statistics",
      "Your study stream aligns with analytics-heavy careers",
      "Preferred career you selected",
    ],
    develop: ["Public communication of technical findings"],
    programs: ["B.Tech Computer Science", "B.Sc Statistics & Data Science"],
  },
  {
    name: "Business Analyst",
    match: 76,
    tier: "Moderate Match",
    why: [
      "Balanced strengths in data handling and communication",
      "Interest in business and decision-making contexts",
    ],
    develop: ["Structured finance skills"],
    programs: ["BBA, B.Tech, B.Com"],
  },
  {
    name: "UX Researcher",
    match: 68,
    tier: "Potential Match",
    why: [
      "Empathetic, people-oriented profile",
      "Enjoys design and human-behaviour topics",
    ],
    develop: ["Formal research methods training"],
    programs: ["B.Des Communication Design"],
  },
];

const sampleUniversities = [
  { name: "Sample Institute of Technology A", type: "Engineering college", state: "Maharashtra", tier: "Verified", note: "Offers verified B.Tech Computer Science aligned to your top career." },
  { name: "Sample College of Science B", type: "Science college", state: "Karnataka", tier: "Category-based", note: "Relevant institution group — verify current program offerings." },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold">Sample Student Report</div>
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {/* Synthetic label */}
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This is a <strong>synthetic sample</strong> shown for demonstration. It references no
            real student and uses example (not live) data to illustrate how a report is structured.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student profile</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["Grade / study level", "Grade 12 (Science stream)"],
              ["Average grade", "High (approx. 85/100)"],
              ["Subjects", "Mathematics, Physics, Chemistry, English"],
              ["Career interest", "Data and technology"],
              ["Study goal", "Explore programs + universities"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment summary</p>
          <p className="mt-2 text-sm text-slate-600">
            In this example, the student completed 3 of 5 optional assessments (stream,
            personality, intelligences). Assessments enrich the recommendations but are not
            required to get started.
          </p>
        </div>

        {/* Career matches */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended careers</p>
          </div>
          <div className="mt-4 space-y-4">
            {sampleCareers.map((c, i) => (
              <div key={c.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">#{i + 1} {c.name}</p>
                    <p className="text-xs text-slate-500">{c.tier}</p>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{c.match}%</span>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Why this fits</p>
                <ul className="mt-1 space-y-1">
                  {c.why.map((w) => (
                    <li key={w} className="flex items-start gap-1.5 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {w}
                    </li>
                  ))}
                </ul>
                {c.develop.length > 0 && (
                  <>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Areas to develop</p>
                    <ul className="mt-1 space-y-1">
                      {c.develop.map((d) => (
                        <li key={d} className="flex items-start gap-1.5 text-sm text-slate-600">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">Recommended programs:</span> {c.programs.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* University options */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">University options</p>
          </div>
          <div className="mt-4 space-y-3">
            {sampleUniversities.map((u) => (
              <div key={u.name} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.type} · {u.state}</p>
                  <p className="mt-1 text-sm text-slate-600">{u.note}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {u.tier}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            University recommendations describe how well an institution fits your profile — not
            your chance of admission.
          </p>
        </section>

        {/* Next steps */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested next steps</p>
          <ol className="mt-3 space-y-2 text-sm text-slate-700">
            {[
              "Review the top careers and shortlist the ones that interest you most.",
              "Explore the recommended programs and universities for your top career.",
              "Discuss the matches with a counselor and plan a follow-up.",
            ].map((s, i) => (
              <li key={s} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </section>

        {/* Counselor */}
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-blue-600" />
            <p className="font-semibold text-blue-900">Counselor notes &amp; follow-up</p>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            In a live report, this section would carry the counselor&apos;s notes, action items and
            follow-up plan for the student.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Try it with your own profile <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <p className="px-2 text-center text-xs text-slate-500">
          Recommendations are directional guidance based on the information shared — not a
          guarantee of any career outcome or admission.
        </p>
      </main>
    </div>
  );
}