"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tokenForStudent, type StudentRef, type TestKind } from "@/lib/tests";

export type AssignmentRow = {
  id: string;
  kind: TestKind;
  token: string;
  status: "ASSIGNED" | "COMPLETED";
  createdAt: string;
  completedAt: string | null;
  hasResult: boolean;
  studentName: string;
  studentEmail: string;
};

const UNASSIGN_WINDOW_MS = 20 * 60 * 1000;

export function AssignClient({
  students,
  initialAssignments,
}: {
  students: StudentRef[];
  initialAssignments: AssignmentRow[];
}) {
  const [studentId, setStudentId] = useState<string>("");
  const [kind, setKind] = useState<TestKind>("stream");
  const [rows, setRows] = useState<AssignmentRow[]>(initialAssignments);
  const [lastToken, setLastToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const unassign = useCallback(async (id: string) => {
    const res = await fetch(`/api/tests/assignments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((x) => x.id !== id));
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error || "Failed to unassign.");
    }
  }, []);

  async function assign() {
    setError("");
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const res = await fetch("/api/tests/assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, kind }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Failed to assign test.");
      return;
    }

    const a = data.assignment;
    setRows((r) => [
      {
        id: a.id,
        kind: a.kind,
        token: a.token,
        status: a.status,
        createdAt: new Date(a.createdAt).toISOString(),
        completedAt: a.completedAt ? new Date(a.completedAt).toISOString() : null,
        hasResult: Boolean(a.result),
        studentName: `${a.student.firstName} ${a.student.lastName}`,
        studentEmail: a.student.email,
      },
      ...r.filter((x) => x.id !== a.id),
    ]);
    setLastToken(a.token);
  }

  const startUrl =
    typeof window !== "undefined" && lastToken
      ? `${window.location.origin}/exam/starttest/${lastToken}`
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Assign a test to a student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {students.length === 0 ? (
            <p className="text-sm text-slate-500">
              No students found for your account. Create students first from the
              Students page.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Student</label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger>
                      <SelectValue>{studentLabel(students, studentId)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} ({s.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Test</label>
                  <Select value={kind} onValueChange={(v) => setKind(v as TestKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stream">Stream Selector (76 questions)</SelectItem>
                      <SelectItem value="ideal">Ideal Career (182 questions)</SelectItem>
                      <SelectItem value="personality">
                        Personality Type Profile (36 questions)
                      </SelectItem>
                      <SelectItem value="intelligences">
                        Multiple Intelligences (54 questions)
                      </SelectItem>
                      <SelectItem value="learning">
                        Learning &amp; Productivity
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={assign} disabled={!studentId}>
                Generate assignment
              </Button>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {lastToken && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm">
              <p className="font-medium text-blue-700">Permanent link (never expires):</p>
              <p className="mt-1 break-all font-mono text-xs text-blue-700">{startUrl}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(startUrl)}
              >
                Copy link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment history</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400">No assignments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((a) => {
                const age = now - new Date(a.createdAt).getTime();
                const remaining = UNASSIGN_WINDOW_MS - age;
                const canUnassign = a.status === "ASSIGNED" && remaining > 0;
                return (
                  <li key={a.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{a.studentName}</p>
                          {a.status === "COMPLETED" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                              Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Assigned</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {a.kind === "stream"
                            ? "Stream Selector"
                            : a.kind === "ideal"
                              ? "Ideal Career"
                              : a.kind === "personality"
                                ? "Personality"
                                : a.kind === "intelligences"
                                  ? "Intelligences"
                                  : "Learning & Productivity"}{" "}
                          ·{" "}
                          assigned {new Date(a.createdAt).toLocaleString()}
                          {a.completedAt &&
                            ` · completed ${new Date(a.completedAt).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          href={`/exam/starttest/${a.token}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Open link
                        </a>
                        {canUnassign ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 border-red-200 text-xs text-red-600 hover:bg-red-50"
                            onClick={() => unassign(a.id)}
                          >
                            Unassign ({formatRemaining(remaining)})
                          </Button>
                        ) : a.status === "ASSIGNED" ? (
                          <span className="text-xs text-slate-400">Unassign window over</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function studentLabel(students: StudentRef[], id: string): string {
  const s = students.find((x) => x.id === id);
  return s ? `${s.firstName} ${s.lastName}` : "Select student";
}
