"use client";

import { useState } from "react";
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

  const tabs = [
    { key: "overview", label: "Overview", icon: ArrowLeft },
    { key: "assessments", label: "Assessments", icon: ListChecks },
    { key: "career", label: "Career Intelligence", icon: TrendingUp },
    { key: "education", label: "Education", icon: GraduationCap },
    { key: "universities", label: "Universities", icon: Building2 },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "actions", label: "Actions", icon: ListChecks },
    { key: "roadmap", label: "Roadmap", icon: Compass },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/counselor/students")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {data.user.firstName} {data.user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{data.user.email}</p>
        </div>
      </div>

      <SummaryBar
        profileComplete={profileComplete}
        assessments={`${data.assessmentCompletedCount}/${data.assessmentTotal}`}
        topCareers={topCareers}
        education={data.profile?.highestEducation || "—"}
        universityCount={data.universityMatches?.matches?.length ?? 0}
        followUpRequired={followUpRequired}
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
        <CareerTab data={data} onSubmitFeedback={submitFeedback} />
      )}
      {tab === "education" && <EducationTab data={data} />}
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
}: any) {
  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Profile" value={pct(profileComplete)} />
        <Stat label="Assessments" value={assessments} />
        <Stat label="Education" value={education} />
        <Stat label="Universities" value={String(universityCount)} />
        <Stat
          label="Top Career"
          value={topCareers[0] ? `${topCareers[0].career.title || topCareers[0].career.name}` : "—"}
        />
        <Stat
          label="Follow-up"
          value={followUpRequired ? "Required" : "None"}
          danger={followUpRequired}
        />
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

function CareerTab({ data, onSubmitFeedback }: any) {
  const matches = data.careerMatches || [];
  if (matches.length === 0)
    return <Card><CardContent className="p-4 text-sm text-muted-foreground">No career matches available yet.</CardContent></Card>;
  return (
    <div className="space-y-3">
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
                <p className="text-xs text-muted-foreground">Conf {m.confidenceScore}%</p>
              </div>
            </div>
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
        {renderGroup("Primary", ep.primary)}
        {renderGroup("Alternative", ep.alternative)}
        {renderGroup("Optional", ep.optional)}
        <p className="font-medium text-sm mb-1 mt-2">Recommended Subjects</p>
        <div className="flex flex-wrap gap-1.5">
          {(ep.recommendedSubjects || []).map((s: any, i: number) => (
            <Badge key={i} variant="outline">{s?.name}</Badge>
          ))}
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
