"use client";

import { useEffect, useMemo, useState } from "react";
import { X, ChevronRight, ChevronLeft, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourRole = "student" | "counselor";

export interface TourStep {
  target: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "left" | "right";
}

const STUDENT_STEPS: TourStep[] = [
  {
    target: "[data-tour='roadmap']",
    title: "Your Study Roadmap",
    body: "This is your personalized step-by-step career plan. It's built from your profile and test results, and gets more precise as you complete assessments.",
    placement: "top",
  },
  {
    target: "[data-tour='tests']",
    title: "Take Career Assessments",
    body: "Your counselor assigns tests for you. Open one to share your interests and strengths — completing them powers your career matches.",
    placement: "top",
  },
  {
    target: "[data-tour='matches']",
    title: "Career Matches",
    body: "Explore careers that fit you, ranked by how strongly they align with what you've shared.",
    placement: "top",
  },
];

const COUNSELOR_STEPS: TourStep[] = [
  {
    target: "[data-tour='students']",
    title: "Manage Students",
    body: "Open the Students screen to see who's assigned to you, reset passwords, view profiles, and open each student's full 360 view.",
    placement: "top",
  },
  {
    target: "[data-tour='assign']",
    title: "Assign Career Tests",
    body: "In the Students screen, generate a test link for a student, share it with them, and track who has completed it.",
    placement: "top",
  },
  {
    target: "[data-tour='roadmap']",
    title: "Guide Student Roadmaps",
    body: "Open a student's 360 view to review and edit their career roadmap — add your own steps and keep their plan on track.",
    placement: "top",
  },
];

const STORAGE_KEY = "suhail_onboarding_done";

function getRect(sel: string): DOMRect | null {
  const el = document.querySelector<HTMLElement>(sel);
  return el ? el.getBoundingClientRect() : null;
}

function bodyScrollLock(lock: boolean) {
  document.body.style.overflow = lock ? "hidden" : "";
}

export function OnboardingTour({ role }: { role: TourRole }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = useMemo(
    () => (role === "counselor" ? COUNSELOR_STEPS : STUDENT_STEPS),
    [role]
  );

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    const seenForRole = done ? done.split(",").includes(role) : false;
    if (seenForRole) return;
    const id = window.setTimeout(() => {
      setVisible(true);
    }, 700);
    return () => window.clearTimeout(id);
  }, [role]);

  useEffect(() => {
    if (!visible) return;
    const current = steps[index];
    const update = () => setRect(getRect(current.target));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    bodyScrollLock(true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      bodyScrollLock(false);
    };
  }, [visible, index, steps]);

  const done = () => {
    const existing = localStorage.getItem(STORAGE_KEY) || "";
    const list = existing ? existing.split(",") : [];
    if (!list.includes(role)) list.push(role);
    localStorage.setItem(STORAGE_KEY, list.join(","));
    setVisible(false);
  };

  if (!visible) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const r = rect;

  const highlightStyle: React.CSSProperties = r
    ? {
        top: r.top - 6,
        left: r.left - 6,
        width: r.width + 12,
        height: r.height + 12,
      }
    : {
        top: "25%",
        left: "30%",
        width: "40%",
        height: "200px",
      };

  const cardBelow = !r || (r.top + r.height) < window.innerHeight * 0.55;

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/60" onClick={done} />
      <div
        className="pointer-events-none absolute z-10 rounded-2xl ring-4 ring-primary/80 shadow-[0_0_0_4px_#fff]"
        style={highlightStyle}
      />

      <div
        className={cn(
          "fixed z-20 w-[min(22rem,90vw)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl",
          cardBelow ? "top-6 right-6" : "bottom-6 right-6"
        )}
      >
        <button
          onClick={done}
          aria-label="Close tour"
          className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Compass className="h-4 w-4" />
          {index + 1} of {steps.length} · {role === "counselor" ? "Counselor" : "Student"} quick tour
        </div>
        <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-slate-300"
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {isLast ? (
              <Button variant="gradient" size="sm" onClick={done}>
                <Sparkles className="h-4 w-4" /> Finish
              </Button>
            ) : (
              <Button variant="gradient" size="sm" onClick={() => setIndex((i) => i + 1)}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
