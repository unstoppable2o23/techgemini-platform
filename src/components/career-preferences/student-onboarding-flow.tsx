"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Globe,
  Briefcase,
  Calendar,
  Layers,
  Wallet,
  Languages,
  Megaphone,
  X,
  Plus,
  Loader2,
  Check,
  ArrowLeft,
  ArrowRight,
  Lock,
  Search,
  User,
  BookOpen,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CAREER_OPTIONS,
  EDUCATION_OPTIONS,
  BUDGET_OPTIONS,
  FUNDING_OPTIONS,
  PROFICIENCY_OPTIONS,
  INTAKE_OPTIONS,
  START_YEAR_OPTIONS,
  SESSION_OPTIONS,
  ENGLISH_TEST_OPTIONS,
  NATIONALITY_OPTIONS,
  INDIAN_STATES,
  COUNTRY_OPTIONS,
  SUBJECT_OPTIONS,
  ACTIVITY_OPTIONS,
  EXAM_OPTIONS,
  STUDY_LEVEL_OPTIONS,
  GRADE_LEVEL_OPTIONS,
  flagFor,
} from "./career-prefs-constants";

type Values = {
  targetColleges: string[];
  collegeNotFinalized: boolean;
  nationality: string;
  state: string;
  hasEnglishResult: boolean;
  englishTestType: string;
  englishTestScore: string;
  englishProficiency: string;
  tuitionBudget: string;
  fundingSource: string;
  targetCountries: string[];
  countryNotFinalized: boolean;
  preferredCareer: string;
  careerNotFinalized: boolean;
  prospectiveSessions: string[];
  preferredIntake: string;
  preferredYear: string;
  highestEducation: string;
  averageGrade: string;
  careerPlanNotes: string;
  gradeLevel: string;
  studyLevel: string;
  exams: string[];
  subjectsStudied: string[];
  subjectsEnjoyed: string[];
  activityInterests: string[];
  mobile: string;
  gender: string;
  dateOfBirth: string;
};

const EMPTY: Values = {
  targetColleges: [],
  collegeNotFinalized: false,
  nationality: "",
  state: "",
  hasEnglishResult: false,
  englishTestType: "",
  englishTestScore: "",
  englishProficiency: "",
  tuitionBudget: "",
  fundingSource: "",
  targetCountries: [],
  countryNotFinalized: false,
  preferredCareer: "",
  careerNotFinalized: false,
  prospectiveSessions: [],
  preferredIntake: "",
  preferredYear: "",
  highestEducation: "",
  averageGrade: "",
  careerPlanNotes: "",
  gradeLevel: "",
  studyLevel: "",
  exams: [],
  subjectsStudied: [],
  subjectsEnjoyed: [],
  activityInterests: [],
  mobile: "",
  gender: "",
  dateOfBirth: "",
};

const STEPS = [
  { title: "About You", icon: User },
  { title: "Academics", icon: BookOpen },
  { title: "Career Interests", icon: Briefcase },
  { title: "Education Goals", icon: GraduationCap },
  { title: "Review", icon: Check },
];

type CollegeResult = { id: string; name: string; country?: string; state?: string; kind: "uni" | "indian" };

export function StudentOnboardingFlow({
  initial,
  isNew,
}: {
  initial?: Partial<Values>;
  isNew: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({ ...EMPTY, ...initial });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [careerOptions, setCareerOptions] = useState<string[]>(CAREER_OPTIONS);

  const [collegeQuery, setCollegeQuery] = useState("");
  const [collegeResults, setCollegeResults] = useState<CollegeResult[]>([]);
  const [collegeOpen, setCollegeOpen] = useState(false);
  const collegeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);

  function set<K extends keyof Values>(field: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  useEffect(() => {
    fetch("/api/careers")
      .then((r) => r.json())
      .then((data) => {
        const dbNames = (data.careers || []).map((c: any) => c.name).filter(Boolean);
        setCareerOptions((prev) => {
          const combined = [...prev];
          for (const n of dbNames) {
            if (!combined.some((c) => c.toLowerCase() === n.toLowerCase())) combined.push(n);
          }
          return combined;
        });
      })
      .catch(() => {});
  }, []);

  // ---- college search ----
  async function searchColleges(query: string) {
    if (!query || query.length < 2) {
      setCollegeResults([]);
      setCollegeOpen(false);
      return;
    }
    const res = await fetch(`/api/student/college-search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results: CollegeResult[] = [
      ...data.universities.map((u: any) => ({ id: u.id, name: u.name, country: u.country, kind: "uni" as const })),
      ...data.institutions.map((i: any) => ({ id: i.id, name: i.name, state: i.state, kind: "indian" as const })),
    ];
    setCollegeResults(results);
    setCollegeOpen(true);
  }
  function handleCollegeChange(q: string) {
    setCollegeQuery(q);
    if (collegeTimer.current) clearTimeout(collegeTimer.current);
    collegeTimer.current = setTimeout(() => searchColleges(q), 250);
  }
  function addCollege(name: string) {
    if (name && !values.targetColleges.includes(name)) {
      set("targetColleges", [...values.targetColleges, name]);
    }
    setCollegeQuery("");
    setCollegeResults([]);
    setCollegeOpen(false);
  }

  function addCountry(name: string) {
    if (name && !values.targetCountries.includes(name)) {
      set("targetCountries", [...values.targetCountries, name]);
    }
    setCountryQuery("");
    setCountryOpen(false);
  }

  function toggleArray(field: "exams" | "subjectsStudied" | "subjectsEnjoyed" | "activityInterests" | "prospectiveSessions", value: string) {
    setValues((prev) => {
      const arr = prev[field] as string[];
      const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
      return { ...prev, [field]: next };
    });
    setError("");
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!values.nationality) return "Please select your nationality.";
      if (values.nationality === "Indian" && !values.state) return "Please select your state.";
      if (!values.studyLevel) return "Please select your study level.";
      if (!values.highestEducation) return "Please select your highest education.";
    }
    if (s === 1) {
      if (!values.gradeLevel) return "Please select your grade level.";
      if (!values.averageGrade) return "Please enter your average grade.";
      const g = parseFloat(values.averageGrade);
      if (isNaN(g) || g < 0 || g > 100) return "Average grade must be between 0 and 100.";
    }
    if (s === 2) {
      if (!values.preferredCareer && !values.careerNotFinalized)
        return "Please choose a preferred career or tick 'I haven't finalized the career yet'.";
    }
    if (s === 3) {
      if (values.targetColleges.length === 0 && !values.collegeNotFinalized)
        return "Please add at least one target college or tick 'I haven't finalized the college yet'.";
      if (values.targetCountries.length === 0 && !values.countryNotFinalized)
        return "Please add at least one target country or tick 'I haven't finalized the country yet'.";
      if (!values.tuitionBudget) return "Please select your tuition budget.";
      if (values.hasEnglishResult) {
        if (!values.englishTestType) return "Please select an English exam type.";
        const score = parseFloat(values.englishTestScore);
        if (!values.englishTestScore || isNaN(score)) return "Please enter your English test score.";
      }
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSave() {
    for (let s = 0; s < STEPS.length - 1; s++) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/student/career-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      if (isNew) router.push("/dashboard");
      else router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setSubmitting(false);
    }
  }

  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.toLowerCase().includes(countryQuery.toLowerCase())
  ).slice(0, 8);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isNew ? "Tell us about yourself" : "Edit your Career Preferences"}
        </CardTitle>
        <CardDescription>
          Your answers help us recommend the right careers, colleges and pathways.
        </CardDescription>
        <StepIndicator step={step} />
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive text-center bg-destructive/10 rounded-md py-2 px-3">
            {error}
          </p>
        )}

        {step === 0 && (
          <div className="space-y-5">
            <Field icon={Globe} label="What is your nationality?">
              <Select value={values.nationality} onValueChange={(v) => set("nationality", v)}>
                <SelectTrigger className="w-full"><SelectValue>Select nationality...</SelectValue></SelectTrigger>
                <SelectContent>
                  {NATIONALITY_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {values.nationality === "Indian" && (
                <div className="mt-3 space-y-2">
                  <Label>Which state are you from?</Label>
                  <Select value={values.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger className="w-full"><SelectValue>Select state...</SelectValue></SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={Layers} label="What is your study level?">
                <Select value={values.studyLevel} onValueChange={(v) => set("studyLevel", v)}>
                  <SelectTrigger className="w-full"><SelectValue>Select study level...</SelectValue></SelectTrigger>
                  <SelectContent>
                    {STUDY_LEVEL_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field icon={Layers} label="Highest level of education?">
                <Select value={values.highestEducation} onValueChange={(v) => set("highestEducation", v)}>
                  <SelectTrigger className="w-full"><SelectValue>Select education...</SelectValue></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_OPTIONS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile (optional)">
                <Input value={values.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="+91..." />
              </Field>
              <Field label="Gender (optional)">
                <Select value={values.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger className="w-full"><SelectValue>Select gender...</SelectValue></SelectTrigger>
                  <SelectContent>
                    {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Date of birth (optional)">
              <Input type="date" value={values.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <Field icon={BookOpen} label="What is your grade / year level?">
              <Select value={values.gradeLevel} onValueChange={(v) => set("gradeLevel", v)}>
                <SelectTrigger className="w-full"><SelectValue>Select grade level...</SelectValue></SelectTrigger>
                <SelectContent>
                  {GRADE_LEVEL_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field icon={Layers} label="What is your average grade? (Scale 1-100)" hint="We match your academics against programs in your range.">
              <Input type="number" inputMode="decimal" min={0} max={100} step="any"
                value={values.averageGrade} onChange={(e) => set("averageGrade", e.target.value)} placeholder="e.g. 85" />
            </Field>

            <Field icon={BookOpen} label="Which exams have you taken or plan to take? (optional)">
              <ChipMulti options={EXAM_OPTIONS} selected={values.exams} onToggle={(v) => toggleArray("exams", v)} />
            </Field>

            <Field icon={BookOpen} label="Which subjects do you study?">
              <ChipMulti options={SUBJECT_OPTIONS} selected={values.subjectsStudied} onToggle={(v) => toggleArray("subjectsStudied", v)} />
            </Field>

            <Field icon={Heart} label="Which subjects do you enjoy most?" hint="Tells us what you'd love to keep doing.">
              <ChipMulti options={SUBJECT_OPTIONS} selected={values.subjectsEnjoyed} onToggle={(v) => toggleArray("subjectsEnjoyed", v)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field icon={Briefcase} label="What is your preferred career? *">
              {!values.careerNotFinalized ? (
                <Select value={values.preferredCareer} onValueChange={(v) => set("preferredCareer", v)}>
                  <SelectTrigger className="w-full"><SelectValue>Choose a career...</SelectValue></SelectTrigger>
                  <SelectContent>
                    {careerOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Career marked as not yet finalized
                </div>
              )}
              <CheckableBanner label="I haven't finalized the career yet"
                checked={values.careerNotFinalized} onChange={(v) => set("careerNotFinalized", v)} />
            </Field>

            <Field icon={Heart} label="What activities do you enjoy? (helps us understand your interests)" hint="Pick all that apply.">
              <ChipMulti options={ACTIVITY_OPTIONS} selected={values.activityInterests} onToggle={(v) => toggleArray("activityInterests", v)} />
            </Field>

            <Field icon={Megaphone} label="How can we help you in your career planning? (optional)">
              <Textarea value={values.careerPlanNotes} onChange={(e) => set("careerPlanNotes", e.target.value)}
                placeholder="Share your ambitions, questions, or anything you'd like guidance on..." rows={4} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Field icon={Globe} label="Which countries are you interested in?">
              <div className="flex flex-wrap gap-2">
                {values.targetCountries.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full mr-2 mb-2">
                    <span className="text-base leading-none">{flagFor(c)}</span>
                    <span className="max-w-[200px] truncate">{c}</span>
                    <button type="button" onClick={() => set("targetCountries", values.targetCountries.filter((x) => x !== c))} aria-label={`Remove ${c}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {!values.countryNotFinalized && (
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={countryQuery} onFocus={() => setCountryOpen(true)}
                        onChange={(e) => { setCountryQuery(e.target.value); setCountryOpen(true); }}
                        placeholder="Choose a country... (start typing)" className="pl-9" />
                    </div>
                    <Button variant="outline" type="button" onClick={() => addCountry(countryQuery)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {countryOpen && (countryQuery || filteredCountries.length > 0) && (
                    <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-background shadow-lg">
                      {filteredCountries.map((c) => (
                        <li key={c}>
                          <button type="button" onClick={() => addCountry(c)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left">
                            <span className="text-base leading-none">{flagFor(c)}</span><span>{c}</span>
                          </button>
                        </li>
                      ))}
                      {countryQuery.length >= 2 && filteredCountries.length === 0 && (
                        <li>
                          <button type="button" onClick={() => addCountry(countryQuery)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left">
                            <span className="text-base leading-none">🌍</span><span>Add &quot;{countryQuery}&quot;</span>
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
              <CheckableBanner label="I haven't finalized the country yet"
                checked={values.countryNotFinalized} onChange={(v) => set("countryNotFinalized", v)} />
            </Field>

            <Field icon={GraduationCap} label="What colleges are you targeting? *" hint="Search all universities and Indian colleges from our database.">
              {values.targetColleges.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full mr-2 mb-2">
                  <span className="max-w-[240px] truncate">{c}</span>
                  <button type="button" onClick={() => set("targetColleges", values.targetColleges.filter((x) => x !== c))} aria-label={`Remove ${c}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {!values.collegeNotFinalized && (
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={collegeQuery} onFocus={() => { if (collegeResults.length) setCollegeOpen(true); }}
                        onChange={(e) => handleCollegeChange(e.target.value)} placeholder="Choose a college... (start typing)" className="pl-9" />
                    </div>
                    <Button variant="outline" type="button" onClick={() => addCollege(collegeQuery)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {collegeOpen && collegeResults.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-background shadow-lg">
                      {collegeResults.map((r) => (
                        <li key={`${r.kind}-${r.id}`}>
                          <button type="button" onClick={() => addCollege(r.name)}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left">
                            <span className="truncate">{r.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {r.kind === "uni" ? (r.country ? `🌍 ${r.country}` : "University") : `🇮🇳 ${r.state || "Indian College"}`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {collegeQuery.length >= 2 && collegeOpen && collegeResults.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No matches found. Press the + button to add your own college.</p>
                  )}
                </div>
              )}
              <CheckableBanner label="I haven't finalized the college yet"
                checked={values.collegeNotFinalized} onChange={(v) => set("collegeNotFinalized", v)} />
            </Field>

            <Field icon={Wallet} label="Select your tuition budget (USD, annual)?">
              <div className="grid gap-2 sm:grid-cols-2">
                {BUDGET_OPTIONS.map((b) => (
                  <button key={b} type="button" onClick={() => set("tuitionBudget", b)}
                    className={cn("rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                      values.tuitionBudget === b ? "bg-accent/10 border-accent text-accent font-medium" : "text-foreground border-border hover:border-accent")}>
                    {b}
                  </button>
                ))}
              </div>
              {values.tuitionBudget && (
                <div className="mt-3 space-y-2">
                  <Label>What is your source of funds?</Label>
                  <div className="grid gap-2">
                    {FUNDING_OPTIONS.map((f) => (
                      <button key={f} type="button" onClick={() => set("fundingSource", f)}
                        className={cn("rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                          values.fundingSource === f ? "bg-accent/10 border-accent text-accent font-medium" : "text-foreground border-border hover:border-accent")}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>

            <Field icon={Languages} label="Let's talk about English tests">
              <div className="flex flex-wrap gap-2">
                {["Yes, I have results", "No, I don't have results"].map((opt) => {
                  const active = values.hasEnglishResult === (opt === "Yes, I have results");
                  return (
                    <button key={opt} type="button" onClick={() => set("hasEnglishResult", opt === "Yes, I have results")}
                      className={cn("rounded-full px-4 py-2 text-sm border transition-colors",
                        active ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground border-border hover:border-accent")}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {values.hasEnglishResult ? (
                <div className="grid gap-4 sm:grid-cols-2 mt-3">
                  <div className="space-y-2">
                    <Label>English Exam Type *</Label>
                    <Select value={values.englishTestType} onValueChange={(v) => { set("englishTestType", v); set("englishTestScore", ""); }}>
                      <SelectTrigger><SelectValue>Select your exam...</SelectValue></SelectTrigger>
                      <SelectContent>
                        {ENGLISH_TEST_OPTIONS.map((t) => (
                          <SelectItem key={t.name} value={t.label}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Score *</Label>
                    <Input type="number" inputMode="decimal" min={0} max={999} step="any"
                      value={values.englishTestScore} onChange={(e) => set("englishTestScore", e.target.value)} placeholder="e.g. 7.5" />
                    {values.englishTestType && (
                      <p className="text-xs text-muted-foreground">
                        {ENGLISH_TEST_OPTIONS.find((t) => t.label === values.englishTestType)?.hint}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  <Label>What's your current English proficiency?</Label>
                  <Select value={values.englishProficiency} onValueChange={(v) => set("englishProficiency", v)}>
                    <SelectTrigger className="w-full"><SelectValue>Select your proficiency...</SelectValue></SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={Calendar} label="Preferred intake (optional)">
                <Select value={values.preferredIntake} onValueChange={(v) => set("preferredIntake", v)}>
                  <SelectTrigger className="w-full"><SelectValue>Select intake...</SelectValue></SelectTrigger>
                  <SelectContent>
                    {INTAKE_OPTIONS.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
              <Field icon={Calendar} label="Preferred start year (optional)">
                <Select value={values.preferredYear} onValueChange={(v) => set("preferredYear", v)}>
                  <SelectTrigger className="w-full"><SelectValue>Select year...</SelectValue></SelectTrigger>
                  <SelectContent>
                    {START_YEAR_OPTIONS.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {step === 4 && (
          <Review values={values} />
        )}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || submitting}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {submitting ? "Saving..." : isNew ? "Finish & View Dashboard" : "Save Changes"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 pt-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const active = i === step;
        const done = i < step;
        return (
          <li key={s.title} className="flex flex-1 items-center gap-2">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
              active ? "bg-accent text-accent-foreground border-accent" : done ? "bg-accent/20 text-accent border-accent" : "text-muted-foreground border-border")}>
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <span className={cn("hidden text-xs sm:block", active ? "text-foreground font-medium" : "text-muted-foreground")}>{s.title}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function Field({ icon: Icon, label, hint, children }: { icon?: any; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className={cn("flex items-center gap-2 text-base", Icon && "text-foreground")}>
        {Icon && <Icon className="h-4 w-4 text-accent" />} {label}
      </Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

function CheckableBanner({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit mt-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

function ChipMulti({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button key={o} type="button" onClick={() => onToggle(o)}
            className={cn("rounded-full px-4 py-2 text-sm border transition-colors",
              active ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground border-border hover:border-accent")}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Review({ values }: { values: Values }) {
  const rows: [string, string][] = [
    ["Nationality", values.nationality || "—"],
    ["State", values.state || "—"],
    ["Study level", values.studyLevel || "—"],
    ["Highest education", values.highestEducation || "—"],
    ["Grade level", values.gradeLevel || "—"],
    ["Average grade", values.averageGrade ? `${values.averageGrade}%` : "—"],
    ["Exams", values.exams.length ? values.exams.join(", ") : "—"],
    ["Subjects studied", values.subjectsStudied.length ? values.subjectsStudied.join(", ") : "—"],
    ["Subjects enjoyed", values.subjectsEnjoyed.length ? values.subjectsEnjoyed.join(", ") : "—"],
    ["Preferred career", values.careerNotFinalized ? "Not finalized yet" : values.preferredCareer || "—"],
    ["Activities", values.activityInterests.length ? values.activityInterests.join(", ") : "—"],
    ["Countries", values.countryNotFinalized ? "Not finalized yet" : values.targetCountries.join(", ") || "—"],
    ["Colleges", values.collegeNotFinalized ? "Not finalized yet" : values.targetColleges.join(", ") || "—"],
    ["Tuition budget", values.tuitionBudget || "—"],
    ["Funding", values.fundingSource || "—"],
    ["English", values.hasEnglishResult ? `${values.englishTestType} ${values.englishTestScore}` : values.englishProficiency || "—"],
  ];
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Review your details before submitting. You can go back to change anything.</p>
      <dl className="divide-y rounded-md border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium max-w-[60%] truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
