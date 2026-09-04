"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Users, GraduationCap, Palette, Rocket, Check, Loader2, RefreshCw,
  Upload, Download, Mail, UserPlus, PartyPopper,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { key: "organization", label: "Organization Details", icon: Building2 },
  { key: "counselors", label: "Add Counselors", icon: Users },
  { key: "students", label: "Add / Import Students", icon: GraduationCap },
  { key: "configure", label: "Configure Basics", icon: Palette },
  { key: "launch", label: "Start Student Journey", icon: Rocket },
];

type SetupData = {
  steps: { key: string; label: string; done: boolean }[];
  completedSteps: number;
  totalSteps: number;
  done: boolean;
};

const SAMPLE_CSV = [
  "firstName,lastName,email,phone,gradeLevel,counselor",
  "Aarav,Sharma,aarav@example.com,9876543210,11th,counselor@school.edu",
  "Isha,Patel,isha@example.com,,12th,counselor@school.edu",
  "Rohan,Gupta,rohan@example.com,,Class 10,",
].join("\n");

export function SetupClient() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/org-admin/setup");
      if (!res.ok) throw new Error("load");
      const data = await res.json();
      setSetup(data);
      if (data.done && active < data.totalSteps) setActive(data.totalSteps);
    } catch {
      setError("Could not load setup progress.");
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const currentStep = useMemo(() => {
    if (setup?.done) return null;
    const firstNotDone = setup?.steps.findIndex((s) => !s.done) ?? 0;
    return firstNotDone >= 0 ? firstNotDone : null;
  }, [setup]);

  const activeKey = (setup?.steps[active]?.key ?? STEPS[0].key);

  if (loading || !setup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading setup…
      </div>
    );
  }

  // Completed state
  if (setup?.done) {
    return (
      <div className="mx-auto max-w-2xl p-6 pt-24 text-center">
        <Card>
          <CardContent className="pt-10 pb-10">
            <PartyPopper className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="mt-4 text-2xl font-bold">You&apos;re ready to invite your students.</h1>
            <p className="mt-2 text-muted-foreground">
              Your organization is set up. Invite students to complete their profile,
              take the assessment, and explore personalized career guidance.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => router.push("/org-admin")}>Go to Dashboard</Button>
              <Button variant="outline" onClick={refresh}>View Setup Details</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Set up your organization</h1>
        <p className="text-muted-foreground">
          Complete these five steps to get your school/consultancy ready for students.
        </p>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Setup progress</span>
            <span className="text-muted-foreground">{setup.completedSteps} / {setup.totalSteps} complete</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${Math.round((setup.completedSteps / setup.totalSteps) * 100)}%` }}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {setup.steps.map((s, i) => {
              const Icon = STEPS[i].icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(i)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active === i ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s.done ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Icon className="h-3.5 w-3.5" />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {/* Step panels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => { const Icon = STEPS[active].icon; return <Icon className="h-5 w-5" />; })()}
            Step {active + 1}: {STEPS[active].label}
          </CardTitle>
          <CardDescription>
            {setup.steps[active]?.done
              ? "This step is complete."
              : "Complete this step to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeKey === "organization" && <OrganizationStep onSaved={refresh} />}
          {activeKey === "counselors" && <CounselorsStep onSaved={refresh} />}
          {activeKey === "students" && <StudentsImportStep onSaved={refresh} />}
          {activeKey === "configure" && <ConfigureStep onSaved={refresh} />}
          {activeKey === "launch" && <LaunchStep onSaved={refresh} />}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => router.push("/org-admin")}>Save & exit</Button>
        <Button onClick={() => setActive(Math.min(active + 1, STEPS.length - 1))} disabled={active >= STEPS.length - 1 && !setup.done}>
          Continue
        </Button>
      </div>
    </div>
  );
}

function StepHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-4">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function OrganizationStep({ onSaved }: { onSaved: () => void }) {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/org-admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactName, contactEmail, contactPhone }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg({ ok: "Organization details saved." });
      onSaved();
    } else {
      setMsg({ error: data.error || "Could not save." });
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <StepHeader title="Primary contact" hint="Who should TechGemini contact about your organization?" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Contact name</Label>
          <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="e.g. Principal" />
        </div>
        <div className="space-y-1.5">
          <Label>Contact email</Label>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="principal@school.edu" required />
        </div>
        <div className="space-y-1.5">
          <Label>Contact phone</Label>
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
      </div>
      {msg?.ok && <p className="text-sm text-green-600">{msg.ok}</p>}
      {msg?.error && <p className="text-sm text-destructive">{msg.error}</p>}
      <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save details</Button>
    </form>
  );
}

function CounselorsStep({ onSaved }: { onSaved: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [created, setCreated] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!firstName || !lastName || !email) { setMsg({ error: "First name, last name and email are required." }); return; }
    setLoading(true);
    const res = await fetch("/api/org-admin/counselors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, title }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setCreated((c) => [...c, email]);
      setFirstName(""); setLastName(""); setEmail(""); setTitle("");
      onSaved();
    } else {
      setMsg({ error: data.error || "Could not add counselor." });
    }
  }

  return (
    <div className="space-y-4">
      <StepHeader title="Add your counseling staff" hint="Counselors guide assigned students through career discovery." />
      <form onSubmit={add} className="rounded-lg border bg-muted/30 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Counselor" /></div>
        </div>
        {msg?.error && <p className="mt-2 text-sm text-destructive">{msg.error}</p>}
        <Button type="submit" disabled={loading} className="mt-3"><UserPlus className="mr-2 h-4 w-4" />Add Counselor</Button>
      </form>
      {created.length > 0 && (
        <p className="text-sm text-green-600">{created.length} counselor(s) added: {created.join(", ")}</p>
      )}
    </div>
  );
}

function StudentsImportStep({ onSaved }: { onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<{ row: number; email?: string; error: string }[]>([]);

  async function upload() {
    setMsg(null);
    if (!file) { setMsg({ error: "Choose a CSV file first." }); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/org-admin/students/import", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    setImportErrors(data.errors ?? []);
    if (res.ok) {
      setMsg({ ok: data.message });
      onSaved();
    } else {
      setMsg({ error: data.error });
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <StepHeader title="Add or import your students" hint="Upload a CSV or add students one at a time to get them onboarded." />
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-2 text-sm font-medium">Bulk import from CSV</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="max-w-sm" />
          <Button type="button" variant="outline" onClick={downloadSample}><Download className="mr-2 h-4 w-4" />Sample CSV</Button>
          <Button type="button" onClick={upload} disabled={loading}><Upload className="mr-2 h-4 w-4" />{loading ? "Importing…" : "Import"}</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Columns: firstName, lastName, email, phone (optional), gradeLevel (optional), counselor (optional — by email).
          Duplicates within the file or your organization are skipped.
        </p>
        {msg?.ok && <p className="mt-2 text-sm text-green-600">{msg.ok}</p>}
        {msg?.error && <p className="mt-2 text-sm text-destructive">{msg.error}</p>}
        {importErrors.length > 0 && (
          <div className="mt-2 rounded bg-card p-3 text-xs">
            <p className="mb-1 font-medium text-destructive">Rows that could not be imported:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {importErrors.map((e, i) => (
                <li key={i}>Row {e.row}{e.email ? ` (${e.email})` : ""}: {e.error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        After importing, use the <strong>Start Student Journey</strong> step to invite students to set up their account.
      </p>
    </div>
  );
}

function ConfigureStep({ onSaved }: { onSaved: () => void }) {
  const [brandName, setBrandName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0F172A");
  const [accentColor, setAccentColor] = useState("#3B82F6");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/org-admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName, primaryColor, accentColor }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg({ ok: "Brand settings saved." });
      onSaved();
    } else {
      setMsg({ error: data.error || "Could not save." });
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <StepHeader title="Brand your organization" hint="Optional. Customize how TechGemini appears for your students." />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Brand name</Label>
          <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Bright Future Academy" />
        </div>
        <div className="space-y-1.5">
          <Label>Primary color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-9 rounded border" />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Accent color</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-9 rounded border" />
            <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
          </div>
        </div>
      </div>
      {msg?.ok && <p className="text-sm text-green-600">{msg.ok}</p>}
      {msg?.error && <p className="text-sm text-destructive">{msg.error}</p>}
      <Button type="submit" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save basics</Button>
    </form>
  );
}

function LaunchStep({ onSaved }: { onSaved: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [invites, setInvites] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/org-admin/students");
        const data = await res.json();
        setStudents(data.students ?? []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function invite(id: string) {
    const res = await fetch(`/api/org-admin/students/${id}/invite`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setInvites((p) => ({ ...p, [id]: data.inviteUrl }));
      onSaved();
    } else {
      setMsg({ error: data.error || "Could not create invite." });
    }
  }

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading students…</div>;

  return (
    <div className="space-y-4">
      <StepHeader title="Invite your students" hint="Send each student a secure link to set up their own password. No passwords are sent over email." />
      {msg?.error && <p className="text-sm text-destructive">{msg.error}</p>}
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students yet. Go back to Step 3 to add or import them.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.firstName} {s.lastName}</p>
                <p className="truncate text-xs text-muted-foreground">{s.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {invites[s.id] ? (
                  <Badge className="gap-1 bg-green-600"><Check className="h-3 w-3" />Invite sent</Badge>
                ) : (
                  <Button size="sm" onClick={() => invite(s.id)}><Mail className="mr-2 h-3.5 w-3.5" />Invite</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p><strong>Operational note:</strong> by default TechGemini does not send email automatically. Copy each student&apos;s invite link and deliver it securely (e.g. via WhatsApp/phone or your own mail), or configure a mail provider for automated delivery. Invite links expire after 7 days.</p>
        {Object.values(invites).filter(Boolean).length > 0 && (
          <div className="mt-2 space-y-1">
            {Object.entries(invites).filter(([, u]) => !!u).map(([id, url]) => {
              const s = students.find((x) => x.id === id);
              return (
                <p key={id} className="break-all"><span className="font-medium">{s?.email}:</span> {url}</p>
              );
            })}
          </div>
        )}
      </div>
      {Object.values(invites).filter(Boolean).length > 0 && (
        <p className="flex items-center gap-2 text-sm text-green-600"><Check className="h-4 w-4" /> Invitation step complete. Continue to finish setup.</p>
      )}
    </div>
  );
}
