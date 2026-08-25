"use client";

import { useState, useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, ArrowLeft, LayoutDashboard } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [brandName, setBrandName] = useState("Study Abroad Platform");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const m = document.querySelector('meta[name="x-tenant-brand"]')?.getAttribute("content");
    if (m) setBrandName(m);
  }, []);

  useEffect(() => {
    if (!email) {
      setLogoUrl(undefined);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/public/logo?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then((data) => setLogoUrl(data.logoUrl || undefined))
        .catch(() => setLogoUrl(undefined));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [email]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-50";

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
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-6 w-6 object-contain" />
            ) : (
              <LayoutDashboard className="h-4 w-4" />
            )}
          </span>
          <span className="text-base font-bold tracking-tight">{brandName}</span>
        </div>

        <div className="relative z-10 mt-auto max-w-md">
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">
            Secure · Workspace
          </span>
          <h1 className="mt-3.5 text-3xl font-bold leading-tight tracking-tight">
            Your study-abroad cockpit, all in one place.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">
            Admissions, counselors, colleges, test prep, and progress — managed from a single, focused dashboard.
          </p>
          <figure className="mt-8 rounded-xl border border-white/15 bg-white/10 p-5 text-[13px] leading-relaxed text-white/90 backdrop-blur">
            &ldquo;Dozens of students, one workspace. Everything about their applications finally lives in the same place.&rdquo;
            <figcaption className="mt-3 flex items-center gap-2.5 text-xs text-white/75">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-[11px] font-semibold">
                AK
              </span>
              Career Counselor
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
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
                ) : (
                  <LayoutDashboard className="h-3 w-3" />
                )}
              </span>
              <span className="font-bold text-slate-800">{brandName}</span>
            </span>
            <span className="hidden text-[#94a3b8] sm:inline">New here?</span>
            <Link href="/auth/register" className="font-semibold text-blue-600 hover:text-blue-700">
              Create account
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[400px] py-12 text-[#1e293b]">
          <h2 className="text-[26px] font-bold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#64748b]">
            Sign in to your workspace to pick up where you left off.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-slate-700">
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-[1.5px] border-slate-400 bg-white transition-colors peer-checked:border-blue-600 peer-checked:bg-blue-600">
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4l2.5 2.5L9 1" />
                </svg>
              </span>
              Keep me signed in for 30 days
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-8 text-center text-[11.5px] text-[#94a3b8]">
            By signing in you agree to our <a href="#" className="text-[#64748b] underline-offset-2 hover:underline">Terms</a> and{" "}
            <a href="#" className="text-[#64748b] underline-offset-2 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}