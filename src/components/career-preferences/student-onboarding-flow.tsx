"use client";

import { useEffect, useRef, useState, useId } from "react";
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
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EDUCATION_OPTIONS,
  BUDGET_OPTIONS,
  FUNDING_OPTIONS,
  PROFICIENCY_OPTIONS,
  INTAKE_OPTIONS,
  START_YEAR_OPTIONS,
  ENGLISH_TEST_OPTIONS,
  NATIONALITY_OPTIONS,
  INDIAN_STATES,
  COUNTRY_OPTIONS,
  ACTIVITY_OPTIONS,
  EXAM_OPTIONS,
  STUDY_LEVEL_OPTIONS,
  flagFor,
} from "./career-prefs-constants";

type Values = {
  nationality: string;
  state: string;
  studyLevel: string;
  studyLevelOther: string;
  gradeLevel: string;
  highestEducation: string;
  highestEducationOther: string;
  mobile: string;
  gender: string;
  dateOfBirth: string;
  averageGrade: string;
  averageGradeUnknown: boolean;
  exams: string[];
  subjectsStudied: string[];
  subjectIdsStudied: string[];
  subjectsEnjoyed: string[];
  subjectIdsEnjoyed: string[];
  subjectOtherStudied: string[];
  subjectOtherEnjoyed: string[];
  subjectOther: string;
  activityInterests: string[];
  preferredCareer: string;
  careerId: string;
  careerNotFinalized: boolean;
  studyAbroad: string;
  targetCountries: string[];
  countryNotFinalized: boolean;
  targetColleges: string[];
  targetCollegeIds: string[];
  collegeNotFinalized: boolean;
  tuitionBudget: string;
  fundingSource: string;
  hasEnglishResult: boolean;
  englishTestType: string;
  englishTestScore: string;
  englishProficiency: string;
  preferredIntake: string;
  preferredYear: string;
  careerPlanNotes: string;
};

const EMPTY: Values = {
  nationality: "",
  state: "",
  studyLevel: "",
  studyLevelOther: "",
  gradeLevel: "",
  highestEducation: "",
  highestEducationOther: "",
  mobile: "",
  gender: "",
  dateOfBirth: "",
  averageGrade: "",
  averageGradeUnknown: false,
  exams: [],
  subjectsStudied: [],
  subjectIdsStudied: [],
  subjectsEnjoyed: [],
  subjectIdsEnjoyed: [],
  subjectOtherStudied: [],
  subjectOtherEnjoyed: [],
  subjectOther: "",
  activityInterests: [],
  preferredCareer: "",
  careerId: "",
  careerNotFinalized: false,
  studyAbroad: "",
  targetCountries: [],
  countryNotFinalized: false,
  targetColleges: [],
  targetCollegeIds: [],
  collegeNotFinalized: false,
  tuitionBudget: "",
  fundingSource: "",
  hasEnglishResult: false,
  englishTestType: "",
  englishTestScore: "",
  englishProficiency: "",
  preferredIntake: "",
  preferredYear: "",
  careerPlanNotes: "",
};

const STEPS = [
  { title: "About You", icon: User },
  { title: "Academics", icon: BookOpen },
  { title: "Career Interests", icon: Briefcase },
  { title: "Education Goals", icon: GraduationCap },
  { title: "Review", icon: Check },
];

type CollegeResult = { id: string; name: string; country?: string; state?: string; kind: "uni" | "indian" };
type SubjectOption = { id: string; name: string };

// Context-aware highest-completed-education options based on the current stage.
function highestEducationOptions(studyLevel: string): string[] {
  const sl = (studyLevel || "").toLowerCase();
  const isSchool = sl.includes("class") || sl.includes("secondary") || sl.includes("school");
  const isUndergrad =
    sl.includes("undergraduate") || sl.includes("bachelor") || sl === "year 1 undergraduate" || sl === "year 2 undergraduate" || sl === "year 3 undergraduate" || sl === "year 4 undergraduate";
  const isPostgrad = sl.includes("postgraduate") || sl.includes("master");
  const isDoctoral = sl.includes("doctoral") || sl.includes("ph.d");

  let base: string[];
  if (isSchool) {
    base = ["Still in school", "Primary School", "Middle School", "Secondary School (Grade 10)", "Grade 12 / High School"];
  } else if (isUndergrad) {
    base = ["Grade 12 / High School", "Diploma", "Bachelor's Degree"];
  } else if (isPostgrad) {
    base = ["Bachelor's Degree", "Postgraduate Diploma / Certificate", "Master's Degree"];
  } else if (isDoctoral) {
    base = ["Master's Degree", "Doctoral Degree"];
  } else {
    base = [...EDUCATION_OPTIONS];
  }
  if (!base.includes("Other")) base.push("Other");
  return base;
}

export function StudentOnboardingFlow({ initial, isNew }: { initial?: Partial<Values>; isNew: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(() => {
    const base = { ...EMPTY, ...initial };
    // If a prefilled value isn't one of the standard options, surface it via "Other".
    if (base.studyLevel && !STUDY_LEVEL_OPTIONS.includes(base.studyLevel)) {
      base.studyLevelOther = base.studyLevel;
      base.studyLevel = "Other";
    }
    if (base.highestEducation && !EDUCATION_OPTIONS.includes(base.highestEducation) && base.highestEducation !== "Other") {
      base.highestEducationOther = base.highestEducation;
      base.highestEducation = "Other";
    }
    return base;
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState("");
  const [subjectKind, setSubjectKind] = useState<"studied" | "enjoyed">("studied");

  const [careerQuery, setCareerQuery] = useState("");
  const [careerResults, setCareerResults] = useState<{ id: string; name: string }[]>([]);
  const [careerOpen, setCareerOpen] = useState(false);
  const careerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function toggleArrayField(field: "exams" | "activityInterests", value: string) {
    setValues((prev) => {
      const arr = prev[field];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
    setError("");
  }

  useEffect(() => {
    let active = true;
    setSubjectsLoading(true);
    setSubjectsError(false);
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setSubjects(d.subjects || []);
      })
      .catch(() => {
        if (!active) return;
        setSubjectsError(true);
      })
      .finally(() => {
        if (active) setSubjectsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // ---- career search ----
  async function searchCareers(query: string) {
    if (!query || query.length < 2) {
      setCareerResults([]);
      setCareerOpen(false);
      return;
    }
    const res = await fetch(`/api/careers?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    setCareerResults((data.careers || []).map((c: any) => ({ id: c.id, name: c.name })).slice(0, 12));
    setCareerOpen(true);
  }
  function handleCareerChange(q: string) {
    setCareerQuery(q);
    if (careerTimer.current) clearTimeout(careerTimer.current);
    careerTimer.current = setTimeout(() => searchCareers(q), 250);
  }
  function selectCareer(c: { id: string; name: string }) {
    set("careerId", c.id);
    set("preferredCareer", c.name);
    setCareerQuery(c.name);
    setCareerResults([]);
    setCareerOpen(false);
  }

  // ---- college search ----
  async function searchColleges(query: string) {
    if (!query || query.length < 2) {
      setCollegeResults([]);
      setCollegeOpen(false);
      return;
    }
    const res = await fetch(`/api/student/college-search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setCollegeResults([
      ...(data.universities || []).map((u: any) => ({ id: u.id, name: u.name, country: u.country, kind: "uni" as const })),
      ...(data.institutions || []).map((i: any) => ({ id: i.id, name: i.name, state: i.state, kind: "indian" as const })),
    ]);
    setCollegeOpen(true);
  }
  function handleCollegeChange(q: string) {
    setCollegeQuery(q);
    if (collegeTimer.current) clearTimeout(collegeTimer.current);
    collegeTimer.current = setTimeout(() => searchColleges(q), 250);
  }
  function addCollege(r: CollegeResult) {
    if (!values.targetCollegeIds.includes(r.id)) {
      set("targetCollegeIds", [...values.targetCollegeIds, r.id]);
      set("targetColleges", [...values.targetColleges, r.name]);
    }
    setCollegeQuery("");
    setCollegeResults([]);
    setCollegeOpen(false);
  }
  function removeCollege(id: string) {
    set("targetCollegeIds", values.targetCollegeIds.filter((x) => x !== id));
    const name = values.targetColleges[values.targetCollegeIds.indexOf(id)];
    set("targetColleges", values.targetColleges.filter((x) => x !== name));
  }

  function addCountry(name: string) {
    if (name && !values.targetCountries.includes(name)) set("targetCountries", [...values.targetCountries, name]);
    setCountryQuery("");
    setCountryOpen(false);
  }

  function toggleSubject(kind: "studied" | "enjoyed", name: string, id?: string) {
    const idsKey = kind === "studied" ? "subjectIdsStudied" : "subjectIdsEnjoyed";
    const namesKey = kind === "studied" ? "subjectsStudied" : "subjectsEnjoyed";
    const otherKey = kind === "studied" ? "subjectOtherStudied" : "subjectOtherEnjoyed";
    // Remove from the explicit "Other" list if present.
    if (values[otherKey].includes(name)) {
      set(otherKey, values[otherKey].filter((x) => x !== name));
      return;
    }
    const ids = values[idsKey];
    const names = values[namesKey];
    const has = names.includes(name);
    set(namesKey, has ? names.filter((x) => x !== name) : [...names, name]);
    if (id) set(idsKey, has ? ids.filter((x) => x !== id) : [...ids, id]);
    setError("");
  }
  function addOtherSubject(kind: "studied" | "enjoyed") {
    const name = values.subjectOther.trim();
    if (!name) return;
    const otherKey = kind === "studied" ? "subjectOtherStudied" : "subjectOtherEnjoyed";
    if (!values[otherKey].includes(name)) set(otherKey, [...values[otherKey], name]);
    setSubjectQuery("");
    set("subjectOther", "");
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!values.nationality) return "Please select your nationality.";
      if (values.nationality === "Indian" && !values.state) return "Please select your state.";
      if (!values.studyLevel) return "Please tell us what you are currently studying.";
      if (values.studyLevel === "Other" && !values.studyLevelOther.trim())
        return "Please specify your current level of study.";
      if (values.highestEducation === "Other" && !values.highestEducationOther.trim())
        return "Please specify your highest completed education.";
    }
    if (s === 1) {
      if (!values.averageGradeUnknown) {
        if (!values.averageGrade) return "Please enter your average grade, or select 'I'm not sure yet'.";
        const g = parseFloat(values.averageGrade);
        if (isNaN(g) || g < 0 || g > 100) return "Average grade must be between 0 and 100.";
      }
    }
    if (s === 2) {
      if (!values.careerNotFinalized && !values.careerId && !values.preferredCareer)
        return "Please choose a preferred career or select \"I haven't decided yet\".";
    }
    if (s === 3) {
      if (!values.studyAbroad) return "Please let us know if you're planning to study abroad.";
      if (values.studyAbroad === "yes") {
        if (values.targetCountries.length === 0 && !values.countryNotFinalized)
          return "Please add at least one country or select \"I haven't finalized the country yet\".";
        if (values.targetColleges.length === 0 && !values.collegeNotFinalized)
          return "Please add at least one college or select \"I haven't finalized the college yet\".";
        if (!values.tuitionBudget) return "Please select your annual tuition budget.";
      }
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
    const payload = {
      ...values,
      averageGrade: values.averageGradeUnknown ? "" : values.averageGrade,
    };
    try {
      const res = await fetch("/api/student/career-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const filteredCountries = COUNTRY_OPTIONS.filter((c) => c.toLowerCase().includes(countryQuery.toLowerCase())).slice(0, 8);
  const heOptions = highestEducationOptions(values.studyLevel);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">{isNew ? "Tell us about yourself" : "Edit your profile"}</CardTitle>
        <CardDescription>
          Help us understand you. There are no wrong answers — you can change these anytime.
        </CardDescription>
        <StepIndicator step={step} />
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive text-center bg-destructive/10 rounded-md py-2 px-3">{error}</p>
        )}

        {step === 0 && (
          <div className="space-y-5">
            <Field icon={Globe} label="What is your nationality?">
              <Select value={values.nationality} onValueChange={(v) => set("nationality", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>Select nationality...</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITY_OPTIONS.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {values.nationality === "Indian" && (
                <div className="mt-3 space-y-2">
                  <Label>Which state are you from?</Label>
                  <Select value={values.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>Select state...</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Field>

            <Field icon={Layers} label="What are you currently studying?">
              <Select value={values.studyLevel} onValueChange={(v) => set("studyLevel", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>Select your current stage...</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STUDY_LEVEL_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {values.studyLevel === "Other" && (
                <div className="mt-3">
                  <Input
                    value={values.studyLevelOther}
                    onChange={(e) => set("studyLevelOther", e.target.value)}
                    placeholder="Please specify your current level of study"
                  />
                </div>
              )}
            </Field>

            {values.studyLevel && values.studyLevel !== "Other" && (
              <Field icon={Layers} label="What is the highest level of education you have completed?">
                <Select value={values.highestEducation} onValueChange={(v) => set("highestEducation", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>Select highest education...</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {heOptions.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {values.highestEducation === "Other" && (
                  <div className="mt-3">
                    <Input
                      value={values.highestEducationOther}
                      onChange={(e) => set("highestEducationOther", e.target.value)}
                      placeholder="Please specify your highest completed education"
                    />
                  </div>
                )}
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mobile (optional)">
                <Input value={values.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="+91..." />
              </Field>
              <Field label="Gender (optional)">
                <Select value={values.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>Select gender...</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {["Male", "Female", "Other", "Prefer not to say"].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
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
            <Field
              icon={Layers}
              label="What is your current overall academic average?"
              hint="Enter your overall average/percentage from recent results. This is not an entrance-exam score (not JEE, SAT, IELTS, etc.)."
            >
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="any"
                  disabled={values.averageGradeUnknown}
                  value={values.averageGrade}
                  onChange={(e) => set("averageGrade", e.target.value)}
                  placeholder="e.g. 85"
                  className="max-w-[200px]"
                />
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values.averageGradeUnknown}
                    onChange={(e) => {
                      set("averageGradeUnknown", e.target.checked);
                      if (e.target.checked) set("averageGrade", "");
                    }}
                  />
                  I'm not sure yet
                </label>
              </div>
            </Field>

            <Field icon={BookOpen} label="Which exams have you taken or plan to take? (optional)">
              <ChipMulti options={EXAM_OPTIONS} selected={values.exams} onToggle={(v) => toggleArrayField("exams", v)} />
            </Field>

            <Field icon={BookOpen} label="Which subjects do you currently study?">
                <SubjectMulti
                subjects={subjects}
                loading={subjectsLoading}
                error={subjectsError}
                selectedNames={[...values.subjectsStudied, ...values.subjectOtherStudied]}
                query={subjectKind === "studied" ? subjectQuery : ""}
                onQuery={(q) => {
                  setSubjectKind("studied");
                  setSubjectQuery(q);
                }}
                onToggle={(name, id) => toggleSubject("studied", name, id)}
                otherValue={values.subjectOther}
                onOtherChange={(v) => set("subjectOther", v)}
                onOtherAdd={() => addOtherSubject("studied")}
              />
            </Field>

            <Field
              icon={Heart}
              label="Which subjects do you enjoy most?"
              hint="This tells us what you'd love to keep doing — different from the subjects you study."
            >
                <SubjectMulti
                subjects={subjects}
                loading={subjectsLoading}
                error={subjectsError}
                selectedNames={[...values.subjectsEnjoyed, ...values.subjectOtherEnjoyed]}
                query={subjectKind === "enjoyed" ? subjectQuery : ""}
                onQuery={(q) => {
                  setSubjectKind("enjoyed");
                  setSubjectQuery(q);
                }}
                onToggle={(name, id) => toggleSubject("enjoyed", name, id)}
                otherValue={values.subjectOther}
                onOtherChange={(v) => set("subjectOther", v)}
                onOtherAdd={() => addOtherSubject("enjoyed")}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <Field icon={Briefcase} label="Which career are you interested in?">
              {!values.careerNotFinalized ? (
                <div className="space-y-2">
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={careerQuery}
                          onFocus={() => values.careerId && setCareerOpen(true)}
                          onChange={(e) => handleCareerChange(e.target.value)}
                          placeholder="Search careers (e.g. Engineering, Design)..."
                          className="pl-9"
                        />
                      </div>
                    </div>
                    {careerOpen && careerResults.length > 0 && (
                      <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-background shadow-lg">
                        {careerResults.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => selectCareer(c)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left"
                            >
                              {c.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {values.preferredCareer && (
                    <p className="text-sm text-muted-foreground">
                      Selected: <span className="font-medium text-foreground">{values.preferredCareer}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" /> Career marked as not yet decided
                </div>
              )}
              <CheckableBanner
                label="I haven't decided yet"
                checked={values.careerNotFinalized}
                onChange={(v) => {
                  set("careerNotFinalized", v);
                  if (v) {
                    set("careerId", "");
                    set("preferredCareer", "");
                  }
                }}
              />
            </Field>

            <Field
              icon={Heart}
              label="What activities do you enjoy?"
              hint="Pick all that apply. These are interests, not a test result."
            >
              <ChipMulti options={ACTIVITY_OPTIONS} selected={values.activityInterests} onToggle={(v) => toggleArrayField("activityInterests", v)} />
            </Field>

            <Field icon={Megaphone} label="Tell us what you're thinking about for your future (optional)">
              <Textarea
                value={values.careerPlanNotes}
                onChange={(e) => set("careerPlanNotes", e.target.value)}
                placeholder="Share your ambitions, questions, or anything you'd like guidance on..."
                rows={4}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <Field icon={Globe} label="Are you planning to study abroad?">
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "yes", label: "Yes" },
                  { v: "no", label: "No" },
                  { v: "unsure", label: "Not sure yet" },
                ].map((opt) => {
                  const active = values.studyAbroad === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => set("studyAbroad", opt.v)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm border transition-colors",
                        active ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground border-border hover:border-accent"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {values.studyAbroad !== "no" && (
              <>
                <Field icon={Globe} label="Which countries are you interested in studying in?">
                  <div className="flex flex-wrap gap-2">
                    {values.targetCountries.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1.5 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full mr-2 mb-2"
                      >
                        <span className="text-base leading-none">{flagFor(c)}</span>
                        <span className="max-w-[200px] truncate">{c}</span>
                        <button
                          type="button"
                          onClick={() => set("targetCountries", values.targetCountries.filter((x) => x !== c))}
                          aria-label={`Remove ${c}`}
                        >
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
                            onFocus={() => setCountryOpen(true)}
                            onChange={(e) => {
                              setCountryQuery(e.target.value);
                              setCountryOpen(true);
                            }}
                            placeholder="Search countries..."
                            className="pl-9"
                          />
                        </div>
                        <Button variant="outline" type="button" onClick={() => addCountry(countryQuery)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {countryOpen && (countryQuery || filteredCountries.length > 0) && (
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
                              <button
                                type="button"
                                onClick={() => addCountry(countryQuery)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10 text-left"
                              >
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
                </Field>

                <Field icon={GraduationCap} label="Which colleges or universities are you considering?">
                  <div className="flex flex-wrap gap-2">
                    {values.targetColleges.map((c, i) => (
                      <span
                        key={`${values.targetCollegeIds[i] || c}`}
                        className="inline-flex items-center gap-1 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full mr-2 mb-2"
                      >
                        <span className="max-w-[240px] truncate">{c}</span>
                        <button
                          type="button"
                          onClick={() => removeCollege(values.targetCollegeIds[i])}
                          aria-label={`Remove ${c}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {!values.collegeNotFinalized && (
                    <div className="relative">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={collegeQuery}
                            onFocus={() => collegeResults.length && setCollegeOpen(true)}
                            onChange={(e) => handleCollegeChange(e.target.value)}
                            placeholder="Search colleges and universities..."
                            className="pl-9"
                          />
                        </div>
                        <Button variant="outline" type="button" onClick={() => addCollege(collegeResults[0])} disabled={!collegeResults.length}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {collegeOpen && collegeResults.length > 0 && (
                        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-background shadow-lg">
                          {collegeResults.map((r) => (
                            <li key={`${r.kind}-${r.id}`}>
                              <button
                                type="button"
                                onClick={() => addCollege(r)}
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
                    </div>
                  )}
                  <CheckableBanner
                    label="I haven't finalized the college yet"
                    checked={values.collegeNotFinalized}
                    onChange={(v) => set("collegeNotFinalized", v)}
                  />
                </Field>

                <Field icon={Wallet} label="What annual tuition budget are you comfortable planning for?">
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
                    <p className="text-xs text-muted-foreground mt-2">
                      This is your approximate tuition per year, not including living costs unless stated.
                    </p>
                  )}
                  {values.tuitionBudget && (
                    <div className="mt-3 space-y-2">
                      <Label>What is your source of funds?</Label>
                      <div className="grid gap-2">
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
                    </div>
                  )}
                </Field>

                <Field icon={Languages} label="Will you need an English-language test for your applications?">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: true, label: "Yes, I have / will take one" },
                      { v: false, label: "No" },
                    ].map((opt) => {
                      const active = values.hasEnglishResult === opt.v;
                      return (
                        <button
                          key={String(opt.v)}
                          type="button"
                          onClick={() => set("hasEnglishResult", opt.v)}
                          className={cn(
                            "rounded-full px-4 py-2 text-sm border transition-colors",
                            active ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground border-border hover:border-accent"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {values.hasEnglishResult ? (
                    <div className="grid gap-4 sm:grid-cols-2 mt-3">
                      <div className="space-y-2">
                        <Label>English exam type</Label>
                        <Select
                          value={values.englishTestType}
                          onValueChange={(v) => {
                            set("englishTestType", v);
                            set("englishTestScore", "");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue>Select your exam...</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {ENGLISH_TEST_OPTIONS.map((t) => (
                              <SelectItem key={t.name} value={t.label}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Overall score</Label>
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
                    <div className="space-y-2 mt-3">
                      <Label>How would you describe your current English proficiency?</Label>
                      <Select value={values.englishProficiency} onValueChange={(v) => set("englishProficiency", v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue>Select your proficiency...</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {PROFICIENCY_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field icon={Calendar} label="Preferred intake (optional)">
                    <Select value={values.preferredIntake} onValueChange={(v) => set("preferredIntake", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>Select intake...</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {INTAKE_OPTIONS.map((i) => (
                          <SelectItem key={i} value={i}>
                            {i}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field icon={Calendar} label="Preferred start year (optional)">
                    <Select value={values.preferredYear} onValueChange={(v) => set("preferredYear", v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue>Select year...</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {START_YEAR_OPTIONS.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </>
            )}
          </div>
        )}

        {step === 4 && <Review values={values} />}

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
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                active ? "bg-accent text-accent-foreground border-accent" : done ? "bg-accent/20 text-accent border-accent" : "text-muted-foreground border-border"
              )}
            >
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
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={cn(
              "rounded-full px-4 py-2 text-sm border transition-colors",
              active ? "bg-accent text-accent-foreground border-accent" : "text-muted-foreground border-border hover:border-accent"
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function SubjectMulti({
  subjects,
  selectedNames,
  query,
  onQuery,
  onToggle,
  otherValue,
  onOtherChange,
  onOtherAdd,
  loading,
  error,
}: {
  subjects: SubjectOption[];
  selectedNames: string[];
  query: string;
  onQuery: (q: string) => void;
  onToggle: (name: string, id?: string) => void;
  otherValue: string;
  onOtherChange: (v: string) => void;
  onOtherAdd: () => void;
  loading?: boolean;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [showOther, setShowOther] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const filtered = subjects
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 50);
  const otherIndex = filtered.length;
  const hasOtherSelected = selectedNames.some(
    (n) => !subjects.some((s) => s.name === n)
  );

  useEffect(() => {
    if (hasOtherSelected) setShowOther(true);
  }, [hasOtherSelected]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function openMenu() {
    setOpen(true);
    setActive(0);
    inputRef.current?.focus();
  }

  function selectSubject(s: SubjectOption) {
    onToggle(s.name, s.id);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, otherIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < filtered.length) {
        selectSubject(filtered[active]);
      } else {
        setShowOther(true);
        setTimeout(() => otherInputRef.current?.focus(), 0);
      }
    }
  }

  return (
    <div className="space-y-3" ref={wrapRef}>
      <div className="flex flex-wrap gap-2">
        {selectedNames.map((n) => (
          <span
            key={n}
            className="inline-flex items-center gap-1 bg-accent/10 text-accent text-sm px-3 py-1.5 rounded-full"
          >
            {n}
            <button type="button" onClick={() => onToggle(n)} aria-label={`Remove ${n}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-label="Search or pick subjects"
              value={query}
              onChange={(e) => {
                onQuery(e.target.value);
                if (!open) setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search or pick subjects..."
              className="pl-9 pr-9"
            />
            <button
              type="button"
              onClick={openMenu}
              aria-label="Toggle subject list"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Subjects"
            className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-background shadow-lg"
          >
            {loading && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Loading subjects…</li>
            )}
            {error && (
              <li className="px-3 py-2 text-sm text-destructive">
                We couldn&apos;t load the subject list. Please try again.
              </li>
            )}
            {!loading && !error && (
              <>
                {filtered.map((s, i) => (
                  <li key={s.id} role="option" aria-selected={selectedNames.includes(s.name)}>
                    <button
                      type="button"
                      ref={(el) => {
                        optionRefs.current[i] = el;
                      }}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSubject(s)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-accent/10",
                        active === i && "bg-accent/10"
                      )}
                    >
                      <span>{s.name}</span>
                      {selectedNames.includes(s.name) && (
                        <Check className="h-3.5 w-3.5 text-accent" />
                      )}
                    </button>
                  </li>
                ))}
                {subjects.length === 0 ? (
                  <li
                    role="option"
                    aria-selected={false}
                    className="px-3 py-2 text-sm text-muted-foreground"
                  >
                    No subjects are available right now.
                  </li>
                ) : filtered.length === 0 ? (
                  <li
                    role="option"
                    aria-selected={false}
                    className="px-3 py-2 text-sm text-muted-foreground"
                  >
                    No matching subject.
                  </li>
                ) : null}
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    ref={(el) => {
                      optionRefs.current[otherIndex] = el;
                    }}
                    onMouseEnter={() => setActive(otherIndex)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setShowOther(true);
                      setTimeout(() => otherInputRef.current?.focus(), 0);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent/10",
                      active === otherIndex && "bg-accent/10"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" /> Other…
                  </button>
                </li>
              </>
            )}
          </ul>
        )}
      </div>

      {showOther && (
        <div className="flex items-center gap-2">
          <Input
            ref={otherInputRef}
            value={otherValue}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Please specify"
            className="max-w-[260px]"
          />
          <Button
            variant="outline"
            type="button"
            onClick={onOtherAdd}
            disabled={!otherValue.trim()}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      )}
    </div>
  );
}

function Review({ values }: { values: Values }) {
  const rows: [string, string][] = [
    ["Nationality", values.nationality || "—"],
    ["State", values.state || "—"],
    ["Currently studying", values.studyLevel === "Other" ? values.studyLevelOther || "—" : values.studyLevel || "—"],
    ["Highest education", values.highestEducation === "Other" ? values.highestEducationOther || "—" : values.highestEducation || "—"],
    ["Average grade", values.averageGradeUnknown ? "Not sure yet" : values.averageGrade ? `${values.averageGrade}%` : "—"],
    ["Exams", values.exams.length ? values.exams.join(", ") : "—"],
    ["Subjects studied", [...values.subjectsStudied, ...values.subjectOtherStudied].length ? [...values.subjectsStudied, ...values.subjectOtherStudied].join(", ") : "—"],
    ["Subjects enjoyed", [...values.subjectsEnjoyed, ...values.subjectOtherEnjoyed].length ? [...values.subjectsEnjoyed, ...values.subjectOtherEnjoyed].join(", ") : "—"],
    ["Preferred career", values.careerNotFinalized ? "Not decided yet" : values.preferredCareer || "—"],
    ["Activities", values.activityInterests.length ? values.activityInterests.join(", ") : "—"],
    [
      "Study abroad",
      values.studyAbroad === "yes" ? "Yes" : values.studyAbroad === "no" ? "No" : values.studyAbroad === "unsure" ? "Not sure yet" : "—",
    ],
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
