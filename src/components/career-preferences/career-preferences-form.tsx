"use client";

import { useEffect, useRef, useState } from "react";
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
  Award,
  BarChart3,
  Lock,
  Search,
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
  flagFor,
} from "./career-prefs-constants";

export type CareerPrefsValues = {
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
};

export const EMPTY_CAREER_PREFS: CareerPrefsValues = {
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
};

type CollegeResult = { id: string; name: string; country?: string; state?: string; type?: string; kind: "uni" | "indian" };

type Props = {
  initial?: Partial<CareerPrefsValues>;
  title?: string;
  description?: string;
  submitLabel?: string;
  submitting?: boolean;
  onSave: (values: CareerPrefsValues) => Promise<void> | void;
};

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full mr-2 mb-2">
      <span className="max-w-[240px] truncate">{label}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="shrink-0">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function CheckableBanner({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      {label}
    </label>
  );
}

function SectionLabel({ icon: Icon, hint, children }: { icon: any; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="flex items-center gap-2 text-base">
        <Icon className="h-4 w-4 text-accent" /> {children}
      </Label>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export function CareerPreferencesForm({ initial, title, description, submitLabel = "Save", submitting, onSave }: Props) {
  const [values, setValues] = useState<CareerPrefsValues>({ ...EMPTY_CAREER_PREFS, ...initial });
  const [error, setError] = useState("");
  const [careerOptions, setCareerOptions] = useState<string[]>(CAREER_OPTIONS);

  const [collegeQuery, setCollegeQuery] = useState("");
  const [collegeResults, setCollegeResults] = useState<CollegeResult[]>([]);
  const [collegeOpen, setCollegeOpen] = useState(false);
  const collegeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);

  function set(field: keyof CareerPrefsValues, value: unknown) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

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
      ...data.institutions.map((i: any) => ({ id: i.id, name: i.name, state: i.state, type: i.type, kind: "indian" as const })),
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
      setValues((prev) => ({ ...prev, targetColleges: [...prev.targetColleges, name] }));
    }
    setCollegeQuery("");
    setCollegeResults([]);
    setCollegeOpen(false);
  }

  function addCountry(name: string) {
    if (name && !values.targetCountries.includes(name)) {
      setValues((prev) => ({ ...prev, targetCountries: [...prev.targetCountries, name] }));
    }
    setCountryQuery("");
    setCountryOpen(false);
  }

  function toggleSession(s: string) {
    setValues((prev) => ({
      ...prev,
      prospectiveSessions: prev.prospectiveSessions.includes(s)
        ? prev.prospectiveSessions.filter((x) => x !== s)
        : [...prev.prospectiveSessions, s],
    }));
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

  function validateEnglishScore(): string | null {
    if (!values.hasEnglishResult) return null;
    const def = ENGLISH_TEST_OPTIONS.find((t) => t.label === values.englishTestType);
    if (!values.englishTestType) return "Please select an English exam type";
    const score = parseFloat(values.englishTestScore);
    if (values.englishTestScore === "" || isNaN(score)) return "Please enter your overall English test score";
    if (def && (score < def.min || score > def.max)) {
      return `Score must be between ${def.min} and ${def.max} for ${def.label}`;
    }
    return null;
  }

  function validate(): string | null {
    if (values.targetColleges.length === 0 && !values.collegeNotFinalized) {
      return "Please add at least one target college or tick 'I haven't finalized the college yet'";
    }
    if (!values.preferredCareer && !values.careerNotFinalized) {
      return "Please choose a preferred career or tick 'I haven't finalized the career yet'";
    }
    const scoreErr = validateEnglishScore();
    if (scoreErr) return scoreErr;
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    await onSave(values);
  }

  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.toLowerCase().includes(countryQuery.toLowerCase())
  ).slice(0, 8);

  const showCountrySuggestions = countryOpen && (countryQuery || filteredCountries.length > 0);

  return (
    <Card className="w-full">
      {(title || description) && (
        <CardHeader className="text-center">
          {title && <CardTitle className="text-2xl">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="space-y-8">
        {error && <p className="text-sm text-destructive text-center">{error}</p>}

        {/* 1. Target colleges */}
        <div className="space-y-3">
          <SectionLabel icon={GraduationCap}>What Colleges are you targeting to join? *</SectionLabel>
          <p className="text-xs text-muted-foreground">Search all universities and Indian colleges from our database.</p>
          {values.targetColleges.map((c) => (
            <Chip key={c} label={c} onRemove={() => set("targetColleges", values.targetColleges.filter((x) => x !== c))} />
          ))}
          {!values.collegeNotFinalized && (
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={collegeQuery}
                    onChange={(e) => handleCollegeChange(e.target.value)}
                    placeholder="Choose a college... (Start typing to search)"
                    className="pl-9"
                    onFocus={() => { if (collegeResults.length) setCollegeOpen(true); }}
                  />
                </div>
                <Button variant="outline" onClick={() => addCollege(collegeQuery)} type="button"><Plus className="h-4 w-4" /></Button>
              </div>
              {collegeOpen && collegeResults.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-background shadow-lg">
                  {collegeResults.map((r) => (
                    <li key={`${r.kind}-${r.id}`}>
                      <button
                        type="button"
                        onClick={() => addCollege(r.name)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left"
                      >
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
          <CheckableBanner
            label="I haven't finalized the college yet"
            checked={values.collegeNotFinalized}
            onChange={(v) => set("collegeNotFinalized", v)}
          />
        </div>

        {/* 2. Nationality */}
        <div className="space-y-3">
          <SectionLabel icon={Globe}>What is your nationality?</SectionLabel>
          <Select value={values.nationality} onValueChange={(v) => set("nationality", v)}>
            <SelectTrigger className="w-full"><SelectValue>Select nationality...</SelectValue></SelectTrigger>
            <SelectContent>
              {NATIONALITY_OPTIONS.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {values.nationality === "Indian" && (
            <div className="space-y-2">
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
        </div>

        {/* 3. English tests */}
        <div className="space-y-3">
          <SectionLabel icon={Languages}>Let&apos;s talk about English tests</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {["Yes, I have results", "No, I don't have results"].map((opt) => {
              const active = values.hasEnglishResult === (opt === "Yes, I have results");
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set("hasEnglishResult", opt === "Yes, I have results")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm border transition-colors",
                    active ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground border-border hover:border-accent"
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {values.hasEnglishResult ? (
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={999}
                  step="any"
                  value={values.englishTestScore}
                  onChange={(e) => set("englishTestScore", e.target.value)}
                  placeholder="e.g. 7.5"
                />
                {values.englishTestType && (
                  <p className="text-xs text-muted-foreground">
                    {ENGLISH_TEST_OPTIONS.find((t) => t.label === values.englishTestType)?.hint}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>What&apos;s your current English proficiency?</Label>
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
        </div>

        {/* 4. Tuition budget + funding */}
        <div className="space-y-3">
          <SectionLabel icon={Wallet}>
            Select your tuition budget (USD)?
            <span className="text-xs font-normal text-muted-foreground"> (annual tuition)</span>
          </SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => set("tuitionBudget", b)}
                className={cn(
                  "rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                  values.tuitionBudget === b
                    ? "bg-accent/10 border-accent text-accent font-medium"
                    : "text-foreground border-border hover:border-accent"
                )}
              >
                {b}
              </button>
            ))}
          </div>
          {values.tuitionBudget && (
            <div className="space-y-2">
              <Label>What is your source of funds?</Label>
              <div className="grid gap-2 sm:grid-cols-1">
                {FUNDING_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => set("fundingSource", f)}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-sm text-left transition-colors",
                      values.fundingSource === f
                        ? "bg-accent/10 border-accent text-accent font-medium"
                        : "text-foreground border-border hover:border-accent"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                We&apos;ll use this to prioritize programs and scholarships that fit your profile.
              </p>
            </div>
          )}
        </div>

        {/* 5. Countries interested */}
        <div className="space-y-3">
          <SectionLabel icon={Globe}>Which countries are you interested in?</SectionLabel>
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
                  <Input
                    value={countryQuery}
                    onChange={(e) => { setCountryQuery(e.target.value); setCountryOpen(true); }}
                    onFocus={() => setCountryOpen(true)}
                    placeholder="Choose a country... (start typing)"
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => addCountry(countryQuery)} type="button"><Plus className="h-4 w-4" /></Button>
              </div>
              {showCountrySuggestions && (
                <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-background shadow-lg">
                  {filteredCountries.map((c) => (
                    <li key={c}>
                      <button
                        type="button"
                        onClick={() => addCountry(c)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left"
                      >
                        <span className="text-base leading-none">{flagFor(c)}</span>
                        <span>{c}</span>
                      </button>
                    </li>
                  ))}
                  {countryQuery.length >= 2 && filteredCountries.length === 0 && (
                    <li>
                      <button type="button" onClick={() => addCountry(countryQuery)} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left">
                        <span className="text-base leading-none">🌍</span>
                        <span>Add &quot;{countryQuery}&quot;</span>
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
          <CheckableBanner
            label="I haven't finalized the country yet"
            checked={values.countryNotFinalized}
            onChange={(v) => set("countryNotFinalized", v)}
          />
        </div>

        {/* 6. Preferred career */}
        <div className="space-y-3">
          <SectionLabel icon={Briefcase}>What is your preferred career? *</SectionLabel>
          {!values.careerNotFinalized ? (
            <Select value={values.preferredCareer} onValueChange={(v) => { set("preferredCareer", v); setError(""); }}>
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
          <CheckableBanner
            label="I haven't finalized the career yet"
            checked={values.careerNotFinalized}
            onChange={(v) => set("careerNotFinalized", v)}
          />
        </div>

        {/* 7. Prospective sessions */}
        <div className="space-y-3">
          <SectionLabel icon={Calendar}>Prospective Sessions to join college (optional)</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {SESSION_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSession(s)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm border transition-colors",
                  values.prospectiveSessions.includes(s)
                    ? "bg-accent text-accent-foreground border-accent"
                    : "text-muted-foreground border-border hover:border-accent"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 8. Preferred start date */}
        <div className="space-y-3">
          <SectionLabel icon={Layers}>When would you like to start your studies?</SectionLabel>
          <p className="text-xs text-muted-foreground">Select the intake / season and the year you&apos;d like to begin.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Intake</Label>
              <Select value={values.preferredIntake} onValueChange={(v) => set("preferredIntake", v)}>
                <SelectTrigger className="w-full"><SelectValue>Select intake...</SelectValue></SelectTrigger>
                <SelectContent>
                  {INTAKE_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={values.preferredYear} onValueChange={(v) => set("preferredYear", v)}>
                <SelectTrigger className="w-full"><SelectValue>Select year...</SelectValue></SelectTrigger>
                <SelectContent>
                  {START_YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 9. Highest education */}
        <div className="space-y-3">
          <SectionLabel icon={Layers}>What is your highest level of education?</SectionLabel>
          <Select value={values.highestEducation} onValueChange={(v) => set("highestEducation", v)}>
            <SelectTrigger className="w-full"><SelectValue>Select your highest education...</SelectValue></SelectTrigger>
            <SelectContent>
              {EDUCATION_OPTIONS.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 10. Average grade + illustration */}
        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div className="space-y-3">
            <SectionLabel icon={BarChart3}>What is your average grade? (Scale 1-100)</SectionLabel>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="any"
              value={values.averageGrade}
              onChange={(e) => set("averageGrade", e.target.value)}
              placeholder="e.g. 85"
            />
            {values.averageGrade && (isNaN(parseFloat(values.averageGrade)) || parseFloat(values.averageGrade) < 0 || parseFloat(values.averageGrade) > 100) && (
              <p className="text-xs text-destructive">Please enter a grade between 0 and 100.</p>
            )}
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="relative w-full max-w-xs overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-accent to-primary p-8 text-white shadow-lg">
              <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                  <Award className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {values.averageGrade ? `${parseFloat(values.averageGrade).toFixed(0)}%` : "—%"}
                  </p>
                  <p className="text-sm text-white/85">Your average grade</p>
                </div>
                <p className="text-xs text-white/70">
                  We match your academics against programs that fit your range.
                </p>
              </div>
              <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </div>
          </div>
        </div>

        {/* 11. Career planning notes */}
        <div className="space-y-3">
          <SectionLabel icon={Megaphone}>How can we help you in your career planning?</SectionLabel>
          <p className="text-xs text-muted-foreground">
            Have big career plans ahead? Even if you don&apos;t——it&apos;s okay! Tell us about your thoughts and preferences for the road ahead.
          </p>
          <Textarea
            value={values.careerPlanNotes}
            onChange={(e) => set("careerPlanNotes", e.target.value)}
            placeholder="Share your ambitions, questions, or anything you'd like guidance on..."
            rows={4}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={submitting} className="w-full sm:w-auto">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {submitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}