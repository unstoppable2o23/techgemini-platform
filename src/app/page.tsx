import Link from "next/link";
import type { Metadata } from "next";
import {
  Compass,
  GraduationCap,
  Building2,
  MessagesSquare,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Career & Study Pathways | TechGemini",
  description:
    "Discover suitable career pathways from your interests, strengths and assessment results — then explore relevant programs and universities.",
};

const valueProps = [
  {
    icon: Compass,
    title: "Matching careers",
    text: "Answers based on your interests, subjects and strengths to highlight careers worth exploring.",
  },
  {
    icon: GraduationCap,
    title: "Clear study pathways",
    text: "See the degrees, specializations and subjects that prepare you for each career.",
  },
  {
    icon: Building2,
    title: "Relevant universities",
    text: "Explore institutions whose programs align with your chosen direction.",
  },
  {
    icon: MessagesSquare,
    title: "Counselor guidance",
    text: "Talk your matches through with a qualified counselor when you need a second opinion.",
  },
];

const steps = [
  {
    title: "Share a few details",
    text: "Tell us about your academics, subjects, interests and study goals.",
  },
  {
    title: "Get career suggestions",
    text: "Review careers ranked by how well they fit the information you've shared.",
  },
  {
    title: "Explore what to study",
    text: "See recommended degrees, specializations and universities for your path.",
  },
  {
    title: "Plan your next step",
    text: "Shortlist, compare, and book a counseling session as you move forward.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight">TechGemini</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/auth/login"
              className="rounded-lg px-3.5 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-blue-600 px-3.5 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50/70 to-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Career + Education Guidance
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
              Discover the career and study path that fits{" "}
              <span className="text-blue-600">you</span>.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              Discover suitable career pathways from your interests, strengths and assessment
              results — then explore relevant programs and universities. All in one calm, guided
              space.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Start my free profile <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                I already have an account
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Recommendations are based on the information you share — they are directional
              guidance, not a guaranteed outcome.{" "}
              <Link href="/demo" className="font-medium text-blue-600 hover:underline">
                See a sample report →
              </Link>
            </p>
          </div>

          {/* Value props */}
          <div className="grid gap-3 sm:grid-cols-2">
            {valueProps.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <v.icon className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-semibold text-slate-900">{v.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          A guided journey that moves from what you share today toward concrete next steps.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-slate-200 p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-3 font-semibold text-slate-900">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For whom */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Who it&apos;s for</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Students",
                text: "Build a clearer sense of careers and study paths aligned with your interests, subjects and goals.",
              },
              {
                title: "Parents & families",
                text: "Follow along with structured recommendations and a shared shortlist as decisions take shape.",
              },
              {
                title: "Counselors",
                text: "Review each student's matches, add notes and follow-ups, and guide them to the right next step.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <p className="mt-3 font-semibold text-slate-900">{c.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">What you get</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            {
              icon: Compass,
              title: "Personalized career matches",
              text: "Careers highlighted based on your academics, subjects, interests and (optional) assessments — with simple reasons why they fit.",
            },
            {
              icon: FileText,
              title: "A guided report-style view",
              text: "Structured insights across career strengths, recommended careers, study pathways and university options.",
            },
            {
              icon: GraduationCap,
              title: "Education pathways",
              text: "Degrees, specializations and subjects that prepare you for the careers you're exploring.",
            },
            {
              icon: MessagesSquare,
              title: "Counselor follow-up",
              text: "Book a session or message your counselor to discuss your matches and next steps.",
            },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-slate-200 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <f.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-900">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-14 text-center md:flex-row md:text-left">
          <div>
            <h2 className="text-2xl font-bold text-white">Ready to explore your path?</h2>
            <p className="mt-1 text-blue-100">
              Start with a few questions about your interests and study goals.
            </p>
          </div>
          <Link
            href="/auth/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
          >
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-slate-500 sm:flex-row">
          <span>© 2026 TechGemini</span>
          <span>Career and education guidance — directional, not a guarantee.</span>
        </div>
      </footer>
    </div>
  );
}