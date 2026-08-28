"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, Calendar, ArrowRight, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BrandLogo } from "@/components/brand-logo";

const GRADE_OPTIONS = [
  "8th", "9th", "10th", "11th", "12th", "Pursuing UG", "Completed UG",
];

const STUDY_LEVEL_OPTIONS = [
  "Bachelor's (Undergraduate)", "Master's (Postgraduate)",
  "PhD / Doctorate", "Diploma / Foundation", "Other",
];

const EXAM_OPTIONS = [
  "IELTS", "TOEFL", "SAT", "ACT", "GRE", "GMAT",
  "A-Levels", "IB Diploma", "CELPIP", "PTE", "None yet",
];

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "USA / Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+966", label: "Saudi Arabia (+966)" },
  { code: "+977", label: "Nepal (+977)" },
  { code: "+880", label: "Bangladesh (+880)" },
  { code: "+94", label: "Sri Lanka (+94)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
  { code: "+27", label: "South Africa (+27)" },
  { code: "+234", label: "Nigeria (+234)" },
  { code: "+20", label: "Egypt (+20)" },
  { code: "+55", label: "Brazil (+55)" },
  { code: "+52", label: "Mexico (+52)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+82", label: "South Korea (+82)" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [brandName, setBrandName] = useState("Study Abroad Platform");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    dateOfBirth: "",
    mobileCountryCode: "+91",
    mobile: "",
    gender: "",
    gradeLevel: "",
    studyLevel: "",
    exams: [] as string[],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const loadTime = useRef(Date.now());

  useEffect(() => {
    const m = document.querySelector('meta[name="x-tenant-brand"]')?.getAttribute("content");
    if (m) setBrandName(m);
  }, []);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleExam(exam: string) {
    setForm((prev) => ({
      ...prev,
      exams: prev.exams.includes(exam)
        ? prev.exams.filter((e) => e !== exam)
        : [...prev.exams, exam],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (honeypotRef.current?.value) return;
    if (Date.now() - loadTime.current < 3000) {
      setError("Please wait a moment before submitting");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mobile: `${form.mobileCountryCode} ${form.mobile}`.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      router.push("/auth/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-50";

  const selectClass =
    "h-auto w-full rounded-lg border-slate-200 bg-white py-2.5 text-sm text-slate-800 shadow-none";

  return (
    <div className="grid min-h-screen bg-[#f0f4f8] lg:grid-cols-2">
      {/* Branded aside */}
      <aside
        className="relative hidden flex-col overflow-hidden px-12 py-10 text-white lg:flex"
        style={{ background: "linear-gradient(135deg, #2563eb, #8b5cf6)" }}
      >
        <div
          className="pointer-events-none absolute -right-1/4 -top-1/4 aspect-square w-4/5 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 60%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-1/3 -left-1/5 aspect-square w-4/5 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.10), transparent 60%)" }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-white/25 bg-white/20 backdrop-blur">
            <BrandLogo className="h-6 w-6 object-contain" />
          </span>
          <span className="text-base font-bold tracking-tight">{brandName}</span>
        </div>

        <div className="relative z-10 mt-auto max-w-md">
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
            Let&rsquo;s get started
          </span>
          <h1 className="mt-3.5 text-3xl font-bold leading-tight tracking-tight">
            Build your study-abroad roadmap.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">
            Create your profile so counselors can match you with the right programs, colleges, and scholarships.
          </p>
          <figure className="mt-8 rounded-xl border border-white/15 bg-white/10 p-5 text-[13px] leading-relaxed text-white/90 backdrop-blur">
            &ldquo;Most students start here and end up abroad within a year. The roadmap does the heavy lifting.&rdquo;
            <figcaption className="mt-3 flex items-center gap-2.5 text-xs text-white/75">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-[11px] font-semibold">
                RN
              </span>
              Admissions Mentor
            </figcaption>
          </figure>
        </div>

        <div className="relative z-10 mt-auto flex gap-5 pt-6 text-[10px] tracking-wide text-white/55">
          <span>© 2026</span>
          <span>SECURE · ENCRYPTED</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#64748b] transition-colors hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            {/* Mobile brand */}
            <span className="flex items-center gap-2 lg:hidden">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white">
                <LayoutDashboard className="h-3 w-3" />
              </span>
              <span className="font-bold text-slate-800">{brandName}</span>
            </span>
            <span className="hidden text-[#94a3b8] sm:inline">Already have an account?</span>
            <Link href="/auth/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[460px] py-8 text-[#1e293b]">
          <h2 className="text-[26px] font-bold tracking-tight">Create account</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#64748b]">
            Fill in your details to get started.
          </p>

          <form
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                e.preventDefault();
              }
            }}
            className="mt-6 flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <input
              ref={honeypotRef}
              type="text"
              name="_hp"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: "absolute", left: "-9999px" }}
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">First Name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    placeholder="John"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">Last Name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    placeholder="Doe"
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">Date of Birth</Label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                  required
                  className={`${inputClass} cursor-pointer [&::-webkit-calendar-picker-indicator]:ml-auto`}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="name@example.com"
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">Create Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">Mobile</Label>
              <div className="flex gap-2">
                <div className="w-[128px] shrink-0">
                  <Select
                    value={form.mobileCountryCode}
                    onValueChange={(v) => update("mobileCountryCode", v)}
                  >
                    <SelectTrigger className={selectClass}>
                      <SelectValue>{form.mobileCountryCode}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.mobile}
                    onChange={(e) => update("mobile", e.target.value.replace(/[^\d\s-]/g, ""))}
                    placeholder="9876543210"
                    required
                    pattern="[0-9\s\-]{5,15}"
                    title="Enter a valid mobile number (digits only)"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                  <SelectTrigger className={selectClass}>
                    <SelectValue>Select gender</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">Student status</Label>
                <Select value={form.gradeLevel} onValueChange={(v) => update("gradeLevel", v)}>
                  <SelectTrigger className={selectClass}>
                    <SelectValue>Select your grade</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                What study level are you planning? *
              </Label>
              <Select value={form.studyLevel} onValueChange={(v) => update("studyLevel", v)}>
                <SelectTrigger className={selectClass}>
                  <SelectValue>Select study level</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STUDY_LEVEL_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block text-[13px] font-medium text-slate-700">
                Which entrance exams are you preparing for?
              </Label>
              <div className="flex flex-wrap gap-2">
                {EXAM_OPTIONS.map((exam) => (
                  <button
                    key={exam}
                    type="button"
                    onClick={() => toggleExam(exam)}
                    className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                      form.exams.includes(exam)
                        ? "border-transparent bg-blue-600 text-white shadow-sm"
                        : "border-slate-300 text-slate-500 hover:border-blue-600 hover:text-blue-600"
                    }`}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? "Creating Account…" : "Create account"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-[11.5px] text-[#94a3b8]">
            By creating an account you agree to our{" "}
            <a href="#" className="text-[#64748b] underline-offset-2 hover:underline">Terms</a> and{" "}
            <a href="#" className="text-[#64748b] underline-offset-2 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}