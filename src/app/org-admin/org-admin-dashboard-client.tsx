"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/page-header";
import { Building2, Users, GraduationCap, LayoutDashboard, CreditCard, RefreshCw, Loader2, UserPlus, ShieldAlert } from "lucide-react";

type OverviewData = {
  organization?: {
    name: string; slug: string; brandName?: string; status: string; planType: string;
    trialEndsAt?: string | null; trialEnded: boolean; contactName?: string; contactEmail?: string; contactPhone?: string;
  };
  subscription?: { planType: string; name: string; status: string; maxCounselors: number; maxStudents: number } | null;
  usage?: { counselorCount: number; studentCount: number; activeStudents: number; assessmentsCompleted: number; counselorNotes: number; counselorActions: number; feedbackCount: number };
};

type Counselor = { id: string; firstName: string; lastName: string; email: string; profileId?: string | null; title?: string | null; assignedStudents: number; active: boolean; createdAt?: string };

export default function OrgAdminDashboardClient() {
  const [tab, setTab] = useState<"overview" | "counselors" | "students" | "billing">("overview");
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, c, s, b] = await Promise.all([
        fetch("/api/org-admin/overview").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/org-admin/counselors").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/org-admin/students").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/org-admin/billing").then((r) => (r.ok ? r.json() : null)),
      ]);
      setOverview(o);
      setCounselors(c?.counselors ?? []);
      setStudents(s?.students ?? []);
      setBilling(b);
    } catch {
      setError("Failed to load organization data.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const org = overview?.organization;
  const sub = overview?.subscription;
  const usage = overview?.usage;

  const NavBtn = ({ id, label, icon: Icon }: { id: typeof tab; label: string; icon: any }) => (
    <Button
      variant={tab === id ? "default" : "ghost"}
      onClick={() => setTab(id)}
      className="justify-start"
    >
      <Icon className="h-4 w-4 mr-2" /> {label}
    </Button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading organization…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pt-20 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader icon={Building2} title="Organization Admin" description="Manage your school/org on TechGemini" eyebrow="B2B" />
        <div className="flex items-center gap-2">
          {org?.status === "SUSPENDED" && (
            <Badge variant="destructive" className="gap-1"><ShieldAlert className="h-3 w-3" /> Suspended</Badge>
          )}
          {org?.status === "TRIAL" && <Badge variant="secondary">Trial{org.trialEnded ? " (ended)" : ""}</Badge>}
          {org?.status === "ACTIVE" && <Badge>Active</Badge>}
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        <NavBtn id="overview" label="Overview" icon={LayoutDashboard} />
        <NavBtn id="counselors" label="Counselors" icon={Users} />
        <NavBtn id="students" label="Students" icon={GraduationCap} />
        <NavBtn id="billing" label="Plan & Billing" icon={CreditCard} />
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Counselors" value={usage?.counselorCount ?? 0} />
            <Stat label="Students" value={usage?.studentCount ?? 0} />
            <Stat label="Active Students" value={usage?.activeStudents ?? 0} />
            <Stat label="Assessments Completed" value={usage?.assessmentsCompleted ?? 0} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Counselor Notes" value={usage?.counselorNotes ?? 0} />
            <Stat label="Follow-up Actions" value={usage?.counselorActions ?? 0} />
            <Stat label="Recommendation Feedback" value={usage?.feedbackCount ?? 0} />
          </div>
          <Card>
            <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {org?.name}</p>
              <p><span className="text-muted-foreground">Brand:</span> {org?.brandName || org?.name}</p>
              <p><span className="text-muted-foreground">Status:</span> {org?.status}</p>
              <p><span className="text-muted-foreground">Plan:</span> {org?.planType} ({sub?.name || "—"})</p>
              {org?.contactName && <p><span className="text-muted-foreground">Contact:</span> {org.contactName}</p>}
              {org?.contactEmail && <p><span className="text-muted-foreground">Email:</span> {org.contactEmail}</p>}
              {org?.contactPhone && <p><span className="text-muted-foreground">Phone:</span> {org.contactPhone}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "counselors" && <CounselorsTab counselors={counselors} onChanged={load} />}

      {tab === "students" && <StudentsTab students={students} counselors={counselors} onChanged={load} />}

      {tab === "billing" && <BillingTab billing={billing} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function CounselorsTab({ counselors, onChanged }: { counselors: Counselor[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<{ success?: string; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!firstName || !lastName || !email) { setMsg({ error: "All fields are required" }); return; }
    setSubmitting(true);
    const res = await fetch("/api/org-admin/counselors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, title }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg({ success: `Counselor created.` });
      setFirstName(""); setLastName(""); setEmail(""); setTitle("");
      setShowForm(false);
      onChanged();
    } else {
      setMsg({ error: data.error || "Failed to create counselor" });
    }
    setSubmitting(false);
  }

  async function toggle(c: Counselor) {
    const next = !c.active;
    await fetch(`/api/org-admin/counselors/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{counselors.length} counselor(s)</p>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : <> <UserPlus className="h-4 w-4 mr-2" /> Add Counselor</>}
        </Button>
      </div>
      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={create} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">First Name</label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                <div><label className="text-sm font-medium">Last Name</label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              </div>
              <div><label className="text-sm font-medium">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><label className="text-sm font-medium">Title</label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Counselor" /></div>
              {msg?.error && <p className="text-sm text-destructive">{msg.error}</p>}
              {msg?.success && <p className="text-sm text-green-600">{msg.success}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          {counselors.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No counselors yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Title</TableHead>
                  <TableHead className="text-right">Assigned Students</TableHead><TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselors.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.title || "—"}</TableCell>
                    <TableCell className="text-right">{c.assignedStudents}</TableCell>
                    <TableCell>
                      <Switch checked={c.active} onCheckedChange={() => toggle(c)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StudentsTab({ students, counselors, onChanged }: { students: any[]; counselors: Counselor[]; onChanged: () => void }) {
  const [sel, setSel] = useState<Record<string, string>>({});

  async function assign(id: string, counselorId: string) {
    if (!counselorId) return;
    await fetch(`/api/org-admin/students/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counselorId }),
    });
    onChanged();
  }

  async function toggle(s: any) {
    await fetch(`/api/org-admin/students/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.active }),
    });
    onChanged();
  }

  return (
    <Card>
      <CardContent className="p-0">
        {students.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No students yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Grade</TableHead>
                <TableHead>Profile</TableHead><TableHead>Assessments</TableHead><TableHead>Counselor</TableHead><TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.firstName} {s.lastName}</TableCell>
                  <TableCell>{s.email}</TableCell>
                  <TableCell>{s.gradeLevel || "—"}</TableCell>
                  <TableCell>{s.profileLevel || "EMPTY"} {s.profileCompleteness != null ? `(${Math.round(s.profileCompleteness)}%)` : ""}</TableCell>
                  <TableCell>{s.assessmentsCompleted}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{s.counselorName || "Unassigned"}</span>
                      <select
                        className="h-8 rounded border border-input bg-background px-1 text-xs"
                        value={sel[s.id] ?? s.counselorId ?? ""}
                        onChange={(e) => { const v = e.target.value; setSel((p) => ({ ...p, [s.id]: v })); assign(s.id, v); }}
                      >
                        <option value="">— assign —</option>
                        {counselors.map((c) => (
                          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </TableCell>
                  <TableCell><Switch checked={s.active} onCheckedChange={() => toggle(s)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function BillingTab({ billing }: { billing: any }) {
  const sub = billing?.subscription;
  const usage = billing?.usage;
  const action = billing?.action;
  return (
    <div className="space-y-4">
      {action === "UPGRADE" && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6">
            <p className="font-medium text-destructive">Your trial has ended.</p>
            <p className="text-sm text-muted-foreground">Your data is preserved. Upgrade to continue adding students and counselors.</p>
            <div className="mt-3 flex gap-2">
              <Button>Contact Sales</Button>
              <Button variant="outline">Request Demo</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p><span className="text-muted-foreground">Plan:</span> {sub?.plan?.name || "—"} ({sub?.plan?.planType || "—"})</p>
          <p><span className="text-muted-foreground">Subscription:</span> {sub?.status || "—"}</p>
          <p><span className="text-muted-foreground">Max counselors:</span> {sub?.plan?.maxCounselors ?? "—"}</p>
          <p><span className="text-muted-foreground">Max students:</span> {sub?.plan?.maxStudents ?? "—"}</p>
          <p><span className="text-muted-foreground">Reports:</span> {sub?.plan?.hasReports ? "Yes" : "No"}</p>
          <p><span className="text-muted-foreground">University recommendations:</span> {sub?.plan?.hasUniversityRecommendations ? "Yes" : "No"}</p>
          <p><span className="text-muted-foreground">Counselor features:</span> {sub?.plan?.hasCounselorFeatures ? "Yes" : "No"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p><span className="text-muted-foreground">Students:</span> {usage?.students?.current ?? 0} / {usage?.students?.limit ?? "∞"} {usage?.students?.atLimit ? "· at limit" : ""}</p>
          <p><span className="text-muted-foreground">Counselors:</span> {usage?.counselors?.current ?? 0} / {usage?.counselors?.limit ?? "∞"} {usage?.counselors?.atLimit ? "· at limit" : ""}</p>
          {billing?.tenant?.trialEndsAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Trial ends {new Date(billing.tenant.trialEndsAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}