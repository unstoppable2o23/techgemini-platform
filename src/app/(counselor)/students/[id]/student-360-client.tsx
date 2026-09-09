"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  MessageSquare,
  TrendingUp,
  GraduationCap,
  Building2,
  StickyNote,
  ListChecks,
  Compass,
  FileText,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  Info,
} from "lucide-react";

import { RoadmapTab } from "./roadmap-tab";

const CAREER_DECISIONS = [
  "SUITABLE",
  "UNSUITABLE",
  "STUDENT_INTERESTED",
  "STUDENT_NOT_INTERESTED",
  "DISCUSS_FURTHER",
];
const UNIVERSITY_DECISIONS = [
  "SUITABLE",
  "UNSUITABLE",
  "STUDENT_INTERESTED",
  "STUDENT_REJECTED",
  "VERIFY_PROGRAM",
  "DISCUSS_FURTHER",
];

function fmtDate(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString();
}

function pct(v: any): string {
  if (v == null) return "—";
  return `${Math.round(Number(v))}%`;
}

function MappingBadge({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    curated: "bg-green-100 text-green-700 border-green-200",
    "institutionType-category": "bg-amber-100 text-amber-700 border-amber-200",
    none: "bg-gray-100 text-gray-600 border-gray-200",
  };
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {status === "curated"
        ? "Verified mapping"
        : status === "institutionType-category"
        ? "Category-based"
        : "Unverified"}
    </Badge>
  );
}

type Student360Data = any;

export default function Student360Client({
  data,
  counselorUserId,
}: {
  data: Student360Data;
  counselorUserId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const studentId = data.user.id;

  const refresh = () => router.refresh();

  const profileComplete = data.careerProfile?.completeness ?? 0;
  const followUpRequired = (data.actions ?? []).some((a: any) => !a.completed);
  const topCareers = (data.careerMatches ?? []).slice(0, 3);

  async function addNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const content = String(fd.get("content") || "").trim();
    const type = String(fd.get("type") || "GENERAL");
    if (!content) return;
    await fetch(`/api/counselor/students/${studentId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type }),
    });
    (e.target as HTMLFormElement).reset();
    refresh();
  }

  async function addAction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    if (!title) return;
    await fetch(`/api/counselor/students/${studentId}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type: String(fd.get("type") || "GENERAL"),
        description: String(fd.get("description") || "") || null,
        dueDate: String(fd.get("dueDate") || "") || null,
      }),
    });
    (e.target as HTMLFormElement).reset();
    refresh();
  }

  async function completeAction(actionId: string, completed: boolean) {
    await fetch(`/api/counselor/students/${studentId}/actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, completed }),
    });
    refresh();
  }

  async function submitFeedback(
    e: React.FormEvent<HTMLFormElement>,
    type: "CAREER" | "UNIVERSITY",
    extra: Record<string, any>
  ) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const decision = String(fd.get("decision") || "");
    const note = String(fd.get("note") || "") || null;
    if (!decision) return;
    await fetch(`/api/counselor/students/${studentId}/recommendation-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationType: type, decision, note, ...extra }),
    });
    refresh();
  }

  async function saveCareerDecision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const careerId = String(fd.get("careerId") || "");
    if (!careerId) return;
    await fetch(`/api/counselor/students/${studentId}/career-decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        careerId,
        discussed: fd.get("discussed") === "on",
        studentInterest: fd.get("studentInterest") === "on",
        shortlistedCareer: fd.get("shortlistedCareer") === "on",
        selectedPathway: fd.get("selectedPathway") === "on",
        followUpRequired: fd.get("followUpRequired") === "on",
        counselorRecommendation: String(fd.get("counselorRecommendation") || "") || null,
        note: String(fd.get("note") || "") || null,
      }),
    });
    refresh();
  }

  async function saveProgramPlan(programId: string, flags: Record<string, boolean>) {
    const careerId = String(flags._careerId || "");
    if (!careerId || !programId) return;
    await fetch(`/api/counselor/students/${studentId}/program-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        careerId,
        programId,
        discussed: flags.discussed,
        shortlisted: flags.shortlisted,
        requiresResearch: flags.requiresResearch,
        studentInterested: flags.studentInterested,
        note: null,
      }),
    });
    refresh();
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: ArrowLeft },
    { key: "assessments", label: "Assessments", icon: ListChecks },
    { key: "career", label: "Career Intelligence", icon: TrendingUp },
    { key: "education", label: "Education", icon: GraduationCap },
    { key: "admissions", label: "Admissions", icon: ShieldCheck },
    { key: "universities", label: "Universities", icon: Building2 },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "actions", label: "Actions", icon: ListChecks },
    { key: "roadmap", label: "Roadmap", icon: Compass },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/students")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {data.user.firstName} {data.user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{data.user.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(`/students/${studentId}/decision-pack`)}>
            <FileText className="h-4 w-4 mr-1.5" />
            Decision Pack
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push(`/students/${studentId}/report`)}>
            <FileText className="h-4 w-4 mr-1.5" />
            Report
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push("/calendar")}>
            <Calendar className="h-4 w-4 mr-1.5" />
            Book follow-up
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push("/messages")}>
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Open chat
          </Button>
        </div>
      </div>

      <SummaryBar
        profileComplete={profileComplete}
        assessments={`${data.assessmentCompletedCount}/${data.assessmentTotal}`}
        topCareers={topCareers}
        education={data.profile?.highestEducation || "—"}
        universityCount={data.universityMatches?.matches?.length ?? 0}
        followUpRequired={followUpRequired}
        journey={data.journey}
        attention={data.attention}
      />

      <div className="flex flex-wrap gap-2 my-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border transition ${
              tab === t.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab data={data} />}
      {tab === "assessments" && <AssessmentsTab data={data} />}
      {tab === "career" && (
        <CareerTab
          data={data}
          onSubmitFeedback={submitFeedback}
          onSaveDecision={saveCareerDecision}
          onSaveProgramPlan={saveProgramPlan}
        />
      )}
      {tab === "education" && <EducationTab data={data} />}
      {tab === "admissions" && <AdmissionsTab data={data} />}
      {tab === "universities" && (
        <UniversitiesTab data={data} onSubmitFeedback={submitFeedback} />
      )}
      {tab === "notes" && (
        <NotesTab
          notes={data.notes}
          onAdd={addNote}
          counselorUserId={counselorUserId}
        />
      )}
      {tab === "actions" && (
        <ActionsTab actions={data.actions} onAdd={addAction} onComplete={completeAction} />
      )}
      {tab === "roadmap" && (
        <RoadmapTab
          studentId={studentId}
          onCounselorStep={(r) => r && refresh()}
        />
      )}
    </div>
  );
}

function SummaryBar({
  profileComplete,
  assessments,
  topCareers,
  education,
  universityCount,
  followUpRequired,
  journey,
  attention,
}: any) {
  const primary = attention?.primary ? String(attention.primary).replace(/_/g, " ").toLowerCase() : "on track";
  const lastActivity = attention?.lastActivityAt
    ? fmtDate(attention.lastActivityAt)
    : "—";
  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4">
        <Stat label="Profile" value={pct(profileComplete)} />
        <Stat label="Assessments" value={assessments} />
        <Stat label="Education" value={education} />
        <Stat label="Universities" value={String(universityCount)} />
        <Stat
          label="Top Career"
          value={topCareers[0] ? `${topCareers[0].career.title || topCareers[0].career.name}` : "—"}
        />
        <Stat
          label="Journey"
          value={journey ? `${journey.percentComplete}%` : "—"}
        />
        <Stat
          label="Roadmap"
          value={journey ? `${journey.roadmapProgress}%` : "—"}
        />
        <Stat
          label="Follow-up"
          value={followUpRequired ? "Required" : "None"}
          danger={followUpRequired}
        />
        <div>
          <p className="text-xs text-muted-foreground">Attention</p>
          <p className={`font-semibold capitalize ${attention?.primary ? "text-orange-600" : "text-green-600"}`}>
            {primary}
          </p>
          <p className="text-[10px] text-muted-foreground">Last activity {lastActivity}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, danger }: any) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${danger ? "text-orange-600" : ""}`}>{value}</p>
    </div>
  );
}

function OverviewTab({ data }: any) {
  const p = data.profile || {};
  const fields = [
    ["Grade Level", p.gradeLevel],
    ["Study Level", p.studyLevel],
    ["Highest Education", p.highestEducation],
    ["Average Grade", p.averageGrade],
    ["Exams", (p.exams || []).join(", ")],
    ["State", p.state],
    ["Target Country", p.targetCountry],
    ["Target Countries", (p.targetCountries || []).join(", ")],
    ["Tuition Budget", p.tuitionBudget],
    ["Preferred Career", p.preferredCareer],
    ["Career Plan Notes", p.careerPlanNotes],
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Student Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {fields.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">{k}</span>
                <span className="font-medium">{v || "—"}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.journey && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Compass className="h-4 w-4" /> Career Journey
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Journey</span>
                <span className="font-medium">{data.journey.percentComplete}%</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Assessments</span>
                <span className="font-medium">
                  {data.journey.assessmentCompletedCount}/{data.journey.assessmentTotal}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Goal career</span>
                <span className="font-medium">{data.journey.goalCareerName || "—"}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Roadmap</span>
                <span className="font-medium">
                  {data.journey.roadmapExists
                    ? `${data.journey.roadmapCompletedCount}/${data.journey.roadmapStepCount} · ${data.journey.roadmapProgress}%`
                    : "Not started"}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Shortlist</span>
                <span className="font-medium">
                  {data.journey.shortlistedCareerCount} careers · {data.journey.shortlistedUniversityCount} universities
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-40 shrink-0">Programs</span>
                <span className="font-medium">
                  {data.journey.programPathwayAvailable ? "Available" : "—"}
                </span>
              </div>
            </div>
            {data.journey.nextBestAction && (
              <div className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                <p className="font-medium">Next best action: {data.journey.nextBestAction.label}</p>
                <p className="text-xs text-blue-700 mt-0.5">{data.journey.nextBestAction.detail}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Appointments
            </h3>
            {(data.appointments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.appointments.slice(0, 5).map((a: any) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      {a.title} · <span className="text-muted-foreground">{fmtDate(a.startTime)}</span>
                    </span>
                    <Badge variant="outline">{a.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Communication
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {(data.chats || []).length} chat thread(s) with this student.
            </p>
            <a
              href="/chat"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
<MessageSquare className="h-4 w-4" /> Open Chat
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProgramPlanning({
  studentId,
  careers,
  defaultCareerId,
  onSaveProgramPlan,
}: any) {
  const [careerId, setCareerId] = useState(defaultCareerId || "");
  const [programs, setPrograms] = useState<any[] | null>(null);

  useEffect(() => {
    setPrograms(null);
    if (!careerId) return;
    fetch(
      `/api/counselor/students/${studentId}/programs?careerId=${encodeURIComponent(careerId)}`
    )
      .then((r) => r.json())
      .then((j) => setPrograms(j.programs ?? []))
      .catch(() => setPrograms([]));
  }, [careerId, studentId]);

  const FLAGS = [
    { key: "discussed", label: "Discussed" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "requiresResearch", label: "Needs research" },
    { key: "studentInterested", label: "Student interested" },
  ] as const;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">Program planning</p>
          <select
            value={careerId}
            onChange={(e) => setCareerId(e.target.value)}
            className="border rounded p-1.5 text-sm"
          >
            {careers.length === 0 && <option value="">Select a career</option>}
            {careers.map((c: any) => (
              <option key={c.careerId} value={c.careerId}>
                {(c.career && (c.career.title || c.career.name)) || c.careerId}
              </option>
            ))}
          </select>
        </div>
        {!programs && <p className="mt-2 text-xs text-muted-foreground">Loading programs…</p>}
        {programs && programs.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            No mapped programs for this career.
          </p>
        )}
        {programs && programs.length > 0 && (
          <div className="mt-2 space-y-2">
            {programs.slice(0, 10).map((p: any) => (
              <div key={p.programId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.programName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.level} · {p.relationshipType}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FLAGS.map((f) => {
                    const active = Boolean(p.plan?.[f.key]);
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() =>
                          onSaveProgramPlan(p.programId, {
                            ...Object.fromEntries(FLAGS.map((x) => [x.key, Boolean(p.plan?.[x.key])])),
                            [f.key]: !active,
                            _careerId: careerId,
                          })
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] border transition ${
                          active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentsTab({ data }: any) {
  const kinds = Object.values(data.assessmentByKind) as any[];
  const labels: Record<string, string> = {
    stream: "Stream Assessment",
    ideal: "Ideal Career",
    personality: "Personality",
    intelligences: "Multiple Intelligences",
    learning: "Learning & Productivity",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">
          Assessment Progress ({data.assessmentCompletedCount}/{data.assessmentTotal})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {kinds.map((k) => (
            <div key={k.kind} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{labels[k.kind] || k.kind}</span>
                {k.completed ? (
                  <Badge variant="secondary" className="text-green-700 bg-green-50">Completed</Badge>
                ) : k.assigned ? (
                  <Badge variant="outline" className="text-amber-600">Assigned</Badge>
                ) : (
                  <Badge variant="outline">Not assigned</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {k.completed ? `Completed ${fmtDate(k.completedAt)}` : "Pending"}
                {k.version ? ` · v${k.version}` : ""}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Open the student&apos;s assessment area to view the full report. This view shows assignment status only.
        </p>
      </CardContent>
    </Card>
  );
}

function CareerTab({ data, onSubmitFeedback, onSaveDecision, onSaveProgramPlan }: any) {
  const matches = data.careerMatches || [];
  const decisions = data.careerDecisions || [];
  const decisionByCareer = new Map(decisions.map((d: any) => [d.careerId, d]));
  if (matches.length === 0)
    return (
      <div className="space-y-3">
        <Card><CardContent className="p-4 text-sm text-muted-foreground">No career matches available yet.</CardContent></Card>
        <ProgramPlanning matches={matches} studentId={data.user.id} onSaveProgramPlan={onSaveProgramPlan} />
      </div>
    );

  const selectedDecision = decisionByCareer.get(matches[0]?.careerId) as any;
  return (
    <div className="space-y-3">
      {/* Phase 27 — system recommendation summary + counselor decision workflow */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">System recommendation</p>
              <p className="text-xs text-muted-foreground">
                {matches[0]?.career.title || matches[0]?.career.name} · {matches[0]?.matchScore}% match (
                confidence {matches[0]?.confidenceScore}%, {matches[0]?.confidenceDetail?.level ?? "LOW"})
              </p>
            </div>
          </div>
          {selectedDecision && (
            <p className="mt-2 text-xs text-muted-foreground">
              Counselor decision recorded:
              {selectedDecision.selectedPathway && " Selected as pathway"}
              {selectedDecision.shortlistedCareer && " · Shortlisted"}
              {selectedDecision.studentInterest && " · Student interested"}
              {selectedDecision.counselorRecommendation
                ? ` · ${selectedDecision.counselorRecommendation}`
                : ""}
            </p>
          )}

          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-blue-600 underline">
              Record a career decision
            </summary>
            <form className="mt-2 grid gap-2 text-sm" onSubmit={onSaveDecision}>
              <select name="careerId" className="w-full border rounded p-2" defaultValue={matches[0]?.careerId}>
                {matches.map((m: any) => (
                  <option key={m.careerId} value={m.careerId}>
                    {m.career.title || m.career.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5">
                  <input name="discussed" type="checkbox" /> Discussed
                </label>
                <label className="flex items-center gap-1.5">
                  <input name="studentInterest" type="checkbox" /> Student interested
                </label>
                <label className="flex items-center gap-1.5">
                  <input name="shortlistedCareer" type="checkbox" /> Shortlisted
                </label>
                <label className="flex items-center gap-1.5">
                  <input name="selectedPathway" type="checkbox" /> Selected as pathway
                </label>
                <label className="flex items-center gap-1.5">
                  <input name="followUpRequired" type="checkbox" /> Needs follow-up
                </label>
              </div>
              <input
                name="counselorRecommendation"
                placeholder="Counselor recommendation (optional)"
                className="w-full border rounded p-2"
              />
              <textarea name="note" placeholder="Note (optional)" className="w-full border rounded p-2" rows={2} />
              <Button type="submit" size="sm">Save decision</Button>
            </form>
          </details>
        </CardContent>
      </Card>

      {matches.map((m: any) => (
        <Card key={m.careerId}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{m.career.title || m.career.name}</p>
                <p className="text-xs text-muted-foreground">{m.career.category}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-accent">{m.matchScore}%</p>
                <p className="text-xs text-muted-foreground">
                  Conf {m.confidenceScore}% · {m.confidenceDetail?.level ?? "LOW"}
                </p>
              </div>
            </div>
            {m.preferenceBoost && (
              <Badge className="mt-1 bg-blue-50 text-blue-700 text-[10px]">Student&apos;s preferred career</Badge>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(m.strengths || []).slice(0, 4).map((s: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-green-700 bg-green-50">{s}</Badge>
              ))}
            </div>
            {(m.developmentAreas || []).length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Develop: {(m.developmentAreas || []).slice(0, 3).join(", ")}
              </p>
            )}

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">Detailed evidence</summary>
              <div className="mt-2 space-y-3 text-xs">
                {/* Dimension scores */}
                {(m.dimensionScores || []).length > 0 && (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1 text-left font-medium">Dimension</th>
                        <th className="py-1 text-right font-medium">Score</th>
                        <th className="py-1 text-right font-medium">Matched signals</th>
                        <th className="py-1 text-left font-medium pl-2">Matched trait values</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(m.dimensionScores as any[])
                        .slice()
                        .sort((a, b) => b.score - a.score)
                        .map((ds: any, i: number) => (
                          <tr key={i} className="border-b border-border/40">
                            <td className="py-1 font-medium">{ds.dimension}</td>
                            <td className="py-1 text-right">{Math.round(ds.score)}</td>
                            <td className="py-1 text-right">{ds.matchedCount}/{ds.totalTraits}</td>
                            <td className="py-1 pl-2 text-muted-foreground">
                              {(ds.matchedValues || []).slice(0, 3).join(", ") || "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}

                {/* Confidence factors */}
                {m.confidenceDetail?.factors && (
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="font-medium">Confidence factors</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Matched signals: {m.confidenceDetail.factors.matchedSignals} · Dimensions matched:{" "}
                      {m.confidenceDetail.factors.dimensionsMatched} · Source diversity:{" "}
                      {m.confidenceDetail.factors.sourceDiversity} · Assessment-derived evidence:{" "}
                      {m.confidenceDetail.factors.assessmentEvidence ? "yes" : "no"} · Coverage:{" "}
                      {Math.round((m.confidenceDetail.factors.coverage ?? 0) * 100)}%
                      {m.confidenceDetail.factors.cappedLow ? " · capped (preferred-only)" : ""}
                    </p>
                  </div>
                )}

                {/* Reason breakdown */}
                {(m.reasons || []).length > 0 && (
                  <div>
                    <p className="font-medium">Reason breakdown</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {(m.reasons as any[]).map((r: any, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="font-medium text-foreground/70">
                            {r.type.replace(/_/g, " ")}:
                          </span>
                          {r.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidence rows */}
                {(m.evidence || []).length > 0 && (
                  <div>
                    <p className="font-medium">Matched evidence</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {(m.evidence as any[])
                        .slice()
                        .sort((a: any, b: any) => b.strength - a.strength)
                        .slice(0, 12)
                        .map((e: any, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="font-medium text-foreground/70">{e.dimension}:</span>
                            <span>{e.studentValue}</span>
                            <span className="text-muted-foreground/60">→</span>
                            <span>{e.careerTraitValue}</span>
                            <span className="text-muted-foreground/60">
                              ({e.sourceType?.toLowerCase()} · {e.matchType})
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Trace highlights */}
                {m.trace && (
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="font-medium">Trace</p>
                    <p className="mt-0.5 text-muted-foreground">
                      Preferred match: {m.trace.preferredCareerMatch ? "yes" : "no"}
                      {m.trace.preferredCareerSource ? ` (source: ${m.trace.preferredCareerSource})` : ""}
                      {" · "}Match types: {(m.trace.matchTypes || []).join(", ") || "none"}
                      {" · "}Supported dimensions: {m.supportedDimensions ?? m.trace.supportedDimensions?.length ?? 0}
                    </p>
                  </div>
                )}

                {/* Missing evidence & verified gaps */}
                {((m.missingEvidence || []).length > 0 || (m.verifiedGaps || []).length > 0) && (
                  <div>
                    <p className="font-medium">What&apos;s not supporting this career yet</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {(m.missingEvidence || []).map((s: string, i: number) => (
                        <li key={`me${i}`}>Missing: {s}</li>
                      ))}
                      {(m.verifiedGaps || []).map((s: string, i: number) => (
                        <li key={`vg${i}`}>Conflict: {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">Record counselor feedback</summary>
              <form className="mt-2 space-y-2" onSubmit={(e) => onSubmitFeedback(e, "CAREER", { careerId: m.careerId })}>
                <select name="decision" className="w-full border rounded p-2 text-sm" defaultValue="">
                  <option value="" disabled>Select decision…</option>
                  {CAREER_DECISIONS.map((d) => (
                    <option key={d} value={d}>{d.replace(/_/g, " ").toLowerCase()}</option>
                  ))}
                </select>
                <textarea name="note" placeholder="Optional note" className="w-full border rounded p-2 text-sm" rows={2} />
                <Button type="submit" size="sm">Save feedback</Button>
              </form>
            </details>
          </CardContent>
        </Card>
      ))}

      <ProgramPlanning
        studentId={data.user.id}
        careers={matches}
        defaultCareerId={matches[0]?.careerId}
        onSaveProgramPlan={onSaveProgramPlan}
      />
    </div>
  );
}

function EducationTab({ data }: any) {
  const ep = data.educationPathways;
  if (!ep)
    return <Card><CardContent className="p-4 text-sm text-muted-foreground">No education pathways available (career matches required first).</CardContent></Card>;
  const renderGroup = (title: string, items: any[]) => (
    <div className="mb-3">
      <p className="font-medium text-sm mb-1">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">None</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((p: any) => (
            <li key={p.id}>
              {p.degree?.name || "Degree"} {p.specialization?.name ? `→ ${p.specialization.name}` : ""}
              {p.notes ? <span className="text-muted-foreground"> — {p.notes}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">Education Pathways</h3>
        {ep.postClass10Pathways && ep.postClass10Pathways.length > 0 && (
          <div className="mb-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
            <p className="font-medium text-sm mb-1">Post–Class 10 pathways</p>
            <ul className="space-y-1 text-sm">
              {ep.postClass10Pathways.map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-accent shrink-0">→</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-1">
              Present both tracks as distinct, equally valid routes; a Diploma/Polytechnic is not an engineering degree.
            </p>
          </div>
        )}
        {renderGroup("Primary", ep.primary)}
        {renderGroup("Alternative", ep.alternative)}
        {renderGroup("Optional", ep.optional)}
        <p className="font-medium text-sm mb-1 mt-2">Recommended Subjects</p>
        <div className="flex flex-wrap gap-1.5">
          {(ep.recommendedSubjects || []).map((s: any, i: number) => (
            <Badge key={i} variant="outline">{s?.name}</Badge>
          ))}
        </div>
        {ep.medicalEducationPath && (
          <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-2">
            <p className="font-medium text-sm">Medical Education Path — {ep.medicalEducationPath.title}</p>
            <p className="text-xs text-muted-foreground">{ep.medicalEducationPath.summary}</p>
            {ep.medicalEducationPath.lastReviewed && (
              <p className="text-xs text-muted-foreground">
                Last reviewed: <time dateTime={ep.medicalEducationPath.lastReviewed}>{ep.medicalEducationPath.lastReviewed}</time>
              </p>
            )}
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><span className="font-medium text-foreground">Entrance (India):</span> {ep.medicalEducationPath.entrance}</p>
              <p><span className="font-medium text-foreground">Primary degree:</span> {ep.medicalEducationPath.degree}</p>
              <p><span className="font-medium text-foreground">Internship / training:</span> {ep.medicalEducationPath.internshipTraining}</p>
              <p><span className="font-medium text-foreground">Registration:</span> {ep.medicalEducationPath.registration}</p>
            </div>
            {ep.medicalEducationPath.alternatives?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ep.medicalEducationPath.alternatives.map((a: string, i: number) => (
                  <Badge key={i} variant="outline">{a}</Badge>
                ))}
              </div>
            )}
            {ep.medicalEducationPath.sources?.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sources: {ep.medicalEducationPath.sources.map((s: any) => s.name).join(", ")}. Wording is
                conservative — confirm requirements with the relevant council and institution.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdmissionsTab({ data }: any) {
  const g = data.decisionCenter?.admissionsGuidance;
  if (!g)
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No admission guidance is available yet — the student has no Decision Center state. Ask the student to build a career profile first.
        </CardContent>
      </Card>
    );

  const readinessVariant =
    g.readiness === "READY_TO_RESEARCH"
      ? "success"
      : g.readiness === "NEEDS_VERIFICATION"
        ? "warning"
        : "destructive";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={readinessVariant}>
            {g.readiness === "READY_TO_RESEARCH" && <CheckCircle2 className="mr-1 h-3 w-3" />}
            {g.readiness === "NEEDS_VERIFICATION" && <AlertTriangle className="mr-1 h-3 w-3" />}
            {g.readiness === "INFORMATION_MISSING" && <Info className="mr-1 h-3 w-3" />}
            {g.readinessLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">{g.readinessReason}</span>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">What applies to the student&apos;s pathway</h4>
          {g.focusPrograms.length === 0 ? (
            <p className="text-sm text-muted-foreground">No education pathway mapped yet.</p>
          ) : (
            <div className="space-y-2">
              {g.focusPrograms.map((p: any) => (
                <div key={p.programId} className="rounded-lg border border-border/70 p-3">
                  <p className="font-medium text-sm">{p.programName}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {p.expectedRoutes.map((r: any) => (
                      <Badge key={r.route} variant="outline">{r.label}</Badge>
                    ))}
                    <Badge variant="secondary">{p.verificationState}</Badge>
                  </div>
                  {p.relevantEntranceExams?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {p.relevantEntranceExams
                        .map((e: any) => `${e.name} — ${e.context}`)
                        .join(" ")}
                    </p>
                  )}
                  {p.eligibilityGuidance && (
                    <p className="text-xs text-muted-foreground mt-1">{p.eligibilityGuidance}</p>
                  )}
                  {p.unknownAspects?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Still to confirm: {p.unknownAspects.join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {g.missingInformation.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-1">Missing info to verify</h4>
            <ul className="space-y-1 text-sm">
              {g.missingInformation.map((m: any) => (
                <li key={m.id} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{m.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-1.5">Official sources</h4>
          {g.officialSources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No official source linked yet — ask the student to check the institution&apos;s admissions page.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {g.officialSources.map((s: any) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {s.name}
                    <span className="text-xs text-muted-foreground"> · {s.domain}</span>
                  </span>
                  <a href={s.canonicalUrl} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">
                      Open Official Source <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
          <h4 className="text-sm font-semibold mb-1">Questions to discuss</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Which focus program does the student want to pursue first?</li>
            <li>Which official source should the student verify first this week?</li>
            {g.missingInformation.length > 0 && (
              <li>Confirm the missing item: {g.missingInformation[0].label}.</li>
            )}
            <li>Set a next action for the student (see the Actions tab).</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function UniversitiesTab({ data, onSubmitFeedback }: any) {
  const matches = data.universityMatches?.matches || [];
  if (matches.length === 0)
    return <Card><CardContent className="p-4 text-sm text-muted-foreground">No university matches available yet.</CardContent></Card>;
  return (
    <div className="space-y-3">
      {matches.map((m: any) => (
        <Card key={m.institution?.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{m.institution?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[m.institution?.institutionType, m.institution?.state, m.institution?.country].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-accent">{m.matchScore}%</p>
                <p className="text-xs text-muted-foreground">Conf {m.confidence}%</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <MappingBadge status={m.mappingStatus} />
              {m.institution?.website && (
                <a href={m.institution.website} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                  Visit
                </a>
              )}
            </div>
            {m.limitations && (
              <p className="text-xs text-amber-700 mt-1">{m.limitations}</p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">Record counselor feedback</summary>
              <form
                className="mt-2 space-y-2"
                onSubmit={(e) =>
                  onSubmitFeedback(e, "UNIVERSITY", {
                    institutionId: m.institution?.id,
                    institutionType: m.institution?.institutionType,
                  })
                }
              >
                <select name="decision" className="w-full border rounded p-2 text-sm" defaultValue="">
                  <option value="" disabled>Select decision…</option>
                  {UNIVERSITY_DECISIONS.map((d) => (
                    <option key={d} value={d}>{d.replace(/_/g, " ").toLowerCase()}</option>
                  ))}
                </select>
                <textarea name="note" placeholder="Optional note" className="w-full border rounded p-2 text-sm" rows={2} />
                <Button type="submit" size="sm">Save feedback</Button>
              </form>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NotesTab({ notes, onAdd }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Counselor Notes</h3>
          <form onSubmit={onAdd} className="space-y-2">
            <select name="type" className="w-full border rounded p-2 text-sm" defaultValue="GENERAL">
              {["GENERAL", "CAREER", "EDUCATION", "UNIVERSITY", "FOLLOW_UP"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ").toLowerCase()}</option>
              ))}
            </select>
            <textarea name="content" required placeholder="Write a note…" className="w-full border rounded p-2 text-sm" rows={3} />
            <Button type="submit" size="sm">Add Note</Button>
          </form>
        </div>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            notes.map((n: any) => (
              <div key={n.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{n.type}</Badge>
                  <span className="text-xs text-muted-foreground">{fmtDate(n.createdAt)}</span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{n.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionsTab({ actions, onAdd, onComplete }: any) {
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Follow-up Actions</h3>
          <form onSubmit={onAdd} className="space-y-2">
            <Input name="title" required placeholder="Action title" />
            <textarea name="description" placeholder="Description (optional)" className="w-full border rounded p-2 text-sm" rows={2} />
            <Input name="dueDate" type="date" />
            <select name="type" className="w-full border rounded p-2 text-sm" defaultValue="FOLLOW_UP">
              {["FOLLOW_UP", "ASSESSMENT", "CAREER_REVIEW", "EDUCATION_REVIEW", "UNIVERSITY_REVIEW", "GENERAL"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ").toLowerCase()}</option>
              ))}
            </select>
            <Button type="submit" size="sm">Add Action</Button>
          </form>
        </div>
        <div className="space-y-2">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No actions yet.</p>
          ) : (
            actions.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                <button onClick={() => onComplete(a.id, !a.completed)} className="mt-0.5">
                  {a.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <p className={`font-medium ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.title}</p>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.type} {a.dueDate ? `· due ${fmtDate(a.dueDate)}` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
