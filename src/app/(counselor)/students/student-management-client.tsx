"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { Search, CheckCircle2, XCircle, KeyRound, Plus, Loader2, Clock, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { formatUsageMinutes } from "@/lib/format-utils";
import { CareerPreferencesForm, type CareerPrefsValues } from "@/components/career-preferences/career-preferences-form";

const FEATURE_LABELS: Record<string, string> = {
  collegeSearch: "College Search",
  collegeFinder: "College Finder",
  aiOddsCalculator: "AI Odds Calculator",
  mockTests: "Mock Tests",
  scholarshipHub: "Scholarship Hub",
  appointments: "Appointments",
  webinars: "Webinars",
  analytics: "Analytics",
  careerLibrary: "Career Library",
  chat: "Chat",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "success" | "warning" | "secondary"; dot: string }
> = {
  ONLINE: { label: "Online", variant: "success", dot: "bg-green-500" },
  IN_TEST: { label: "In Test", variant: "warning", dot: "bg-orange-500" },
  OFFLINE: { label: "Offline", variant: "secondary", dot: "bg-gray-400" },
};

function formatLastSeen(date: string | Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function StudentManagementClient({
  students: initialStudents,
}: {
  students: any[];
}) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [profileTarget, setProfileTarget] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [careerInitial, setCareerInitial] = useState<Partial<CareerPrefsValues>>({});
  const [careerSaving, setCareerSaving] = useState(false);
  const [careerSaved, setCareerSaved] = useState(false);
  const GRADE_OPTIONS = ["8th", "9th", "10th", "11th", "12th", "Pursuing UG", "Completed UG"];

  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(id);
  }, [router]);

  const filteredStudents = students.filter((s) => {
    const nameMatch =
      `${s.firstName} ${s.lastName} ${s.email}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const statusMatch =
      statusFilter === "all" ||
      s.studentProfile?.status === statusFilter;
    return nameMatch && statusMatch;
  });

  async function toggleFeature(
    studentId: string,
    featureKey: string,
    value: boolean
  ) {
    try {
      const res = await fetch(
        `/api/counselor/students/${studentId}/features`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [featureKey]: value }),
        }
      );
      if (!res.ok) throw new Error("Failed to update");
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === studentId && s.studentProfile?.featureAccess) {
            return {
              ...s,
              studentProfile: {
                ...s.studentProfile,
                featureAccess: {
                  ...s.studentProfile.featureAccess,
                  [featureKey]: value,
                },
              },
            };
          }
          return s;
        })
      );
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle feature:", err);
    }
  }

  async function toggleAccountStatus(studentId: string, isActive: boolean) {
    try {
      const res = await fetch(
        `/api/counselor/students/${studentId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        }
      );
      if (!res.ok) throw new Error("Failed to update");
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, isActive } : s
        )
      );
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle account status:", err);
    }
  }

  async function addStudent() {
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/counselor/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to create student");
        return;
      }
      setStudents((prev) => [data.student, ...prev]);
      setAddOpen(false);
      setAddForm({ firstName: "", lastName: "", email: "", password: "" });
      router.refresh();
    } catch {
      setAddError("Failed to create student");
    } finally {
      setAdding(false);
    }
  }

  async function resetStudentPassword() {
    if (!resetTarget) return;
    setResetting(true);
    setResetError("");
    try {
      const res = await fetch(`/api/counselor/students/${resetTarget.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setResetError(data.error || "Failed to reset password");
        return;
      }
      setResetTarget(null);
      setResetPassword("");
    } catch {
      setResetError("Failed to reset password");
    } finally {
      setResetting(false);
    }
  }

  async function openProfile(student: any) {
    setProfileTarget(student);
    setProfileLoading(true);
    setProfileSaved(false);
    setCareerSaved(false);
    const res = await fetch(`/api/counselor/students/${student.id}/profile`);
    const data = await res.json();
    const s = data.student;
    const p = s?.studentProfile || {};
    setProfileData({
      firstName: s?.firstName || "",
      lastName: s?.lastName || "",
      email: s?.email || "",
      mobile: p.mobile || "",
      gender: p.gender || "",
      gradeLevel: p.gradeLevel || "",
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : "",
      targetColleges: p.targetColleges || [],
      targetCountries: p.targetCountries || [],
      preferredCareer: p.preferredCareer || "",
      prospectiveSessions: p.prospectiveSessions || [],
    });
    setCareerInitial({
      targetColleges: p.targetColleges || [],
      collegeNotFinalized: p.careerPrefsFilled ? p.targetColleges.length === 0 : false,
      nationality: p.nationality || "",
      state: p.state || "",
      hasEnglishResult: !!p.hasEnglishResult,
      englishTestType: p.englishTestType || "",
      englishTestScore: p.englishTestScore || "",
      englishProficiency: p.englishProficiency || "",
      tuitionBudget: p.tuitionBudget || "",
      fundingSource: p.fundingSource || "",
      targetCountries: p.targetCountries || [],
      countryNotFinalized: p.careerPrefsFilled ? p.targetCountries.length === 0 : false,
      preferredCareer: p.preferredCareer || "",
      careerNotFinalized: p.careerPrefsFilled ? !p.preferredCareer : false,
      prospectiveSessions: p.prospectiveSessions || [],
      preferredIntake: p.preferredIntake || "",
      preferredYear: p.preferredYear || "",
      highestEducation: p.highestEducation || "",
      averageGrade: p.averageGrade || "",
      careerPlanNotes: p.careerPlanNotes || "",
    });
    setProfileLoading(false);
  }

  async function saveProfile() {
    if (!profileTarget) return;
    setProfileSaving(true);
    setProfileSaved(false);
    await fetch(`/api/counselor/students/${profileTarget.id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
    setProfileSaved(true);
    setProfileSaving(false);
  }

  async function saveCareer(values: CareerPrefsValues) {
    if (!profileTarget) return;
    setCareerSaving(true);
    setCareerSaved(false);
    const res = await fetch(`/api/counselor/students/${profileTarget.id}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) setCareerSaved(true);
    setCareerSaving(false);
  }

  return (
    <div className="space-y-6 p-6 pt-20">
      <PageHeader
          icon={User}
          title="Student Management"
          description="Manage students, control feature access, and monitor activity."
          eyebrow="Counselor"
          actions={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Student
            </Button>
          }
        />
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {addError && (
                <p className="text-sm text-destructive">{addError}</p>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={addForm.firstName}
                  onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={addForm.lastName}
                  onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addStudent} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Create Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
            <SelectItem value="IN_TEST">In Test</SelectItem>
            <SelectItem value="OFFLINE">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Usage Time</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="min-w-[400px]">
                  Feature Access
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student: any) => {
                  const status =
                    student.studentProfile?.status || "OFFLINE";
                  const sConfig =
                    STATUS_CONFIG[status] || STATUS_CONFIG.OFFLINE;
                  const features =
                    student.studentProfile?.featureAccess || {};

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            fallback={
                              student.firstName[0] + student.lastName[0]
                            }
                          />
                          <div>
                            <p className="text-sm font-medium leading-none">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={sConfig.variant}
                          className="gap-1.5"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sConfig.dot}`}
                          />
                          {sConfig.label}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {student.lastSeen
                            ? formatLastSeen(student.lastSeen)
                            : "Never"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatUsageMinutes(student.totalUsageMinutes ?? 0)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Switch
                          checked={student.isActive}
                          onCheckedChange={(checked) =>
                            toggleAccountStatus(student.id, checked)
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(FEATURE_LABELS).map(
                            ([key, label]) => (
                              <div
                                key={key}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-colors ${
                                  features[key]
                                    ? "bg-accent/10 text-accent border border-accent/20"
                                    : "bg-muted text-muted-foreground border border-transparent"
                                }`}
                                onClick={() =>
                                  toggleFeature(
                                    student.id,
                                    key,
                                    !features[key]
                                  )
                                }
                              >
                                {features[key] ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {label}
                              </div>
                            )
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View Profile"
                            onClick={() => openProfile(student)}>
                            <User className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset Password"
                            onClick={() => {
                              setResetTarget({ id: student.id, name: `${student.firstName} ${student.lastName}` });
                              setResetPassword("");
                              setResetError("");
                            }}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!profileTarget} onOpenChange={(o) => { if (!o) { setProfileTarget(null); setProfileData(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Student Profile</DialogTitle></DialogHeader>
          {profileLoading ? (
            <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : profileData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={profileData.firstName} onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={profileData.lastName} onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input value={profileData.mobile} onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={profileData.dateOfBirth} onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={profileData.gender} onValueChange={(v) => setProfileData({ ...profileData, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Student Status</Label>
                <Select value={profileData.gradeLevel} onValueChange={(v) => setProfileData({ ...profileData, gradeLevel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {profileSaved && <p className="text-sm text-green-600">Basic details saved successfully!</p>}
              <div className="border-t pt-5 space-y-4">
                <p className="text-sm font-semibold">Career Preferences</p>
                <CareerPreferencesForm
                  initial={careerInitial}
                  submitting={careerSaving}
                  submitLabel="Save Career Preferences"
                  onSave={saveCareer}
                />
                {careerSaved && <p className="text-sm text-green-600">Career preferences saved successfully!</p>}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setProfileTarget(null); setProfileData(null); }}>Cancel</Button>
            <Button onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Basic Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {resetError && (
              <p className="text-sm text-destructive">{resetError}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Reset password for <strong>{resetTarget?.name}</strong>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Min 6 characters"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={resetStudentPassword} disabled={resetting || resetPassword.length < 6}>
              {resetting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
