"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildReport,
  DOMAIN_META,
  KIND_LABELS,
  orderedOptions,
  questionsFor,
  type ExamReport,
  type TestKind,
} from "@/lib/tests";
import personalityProfiles from "@/data/personality-profiles.json";

type Props = { token: string; kind: TestKind };

type ReportMeta = {
  studentName: string;
  testTitle: string;
  logoUrl: string | null;
  brandName: string;
  counselorName: string | null;
};

export function ExamClient({ token, kind }: Props) {
  const bank = useMemo(() => questionsFor(kind), [kind]);
  const ordered = useMemo(
    () =>
      Object.values(bank)
        .sort((a, b) => Number(a.id) - Number(b.id))
        .map((q) => ({ id: String(q.id), domain: Number(q.domain_id) })),
    [bank]
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState<ExamReport | null>(null);
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const progressKey = `exam_progress_${token}`;
  const resultKey = `exam_result_${token}`;
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let localProgress: Record<string, string> = {};
      try {
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          localProgress = JSON.parse(savedProgress);
          if (!cancelled) setAnswers(localProgress);
        }
      } catch {}
      try {
        const savedResult = localStorage.getItem(resultKey);
        if (savedResult && !cancelled) {
          setReport(JSON.parse(savedResult));
          fetch(`/api/tests/assignments/complete?token=${encodeURIComponent(token)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d && !cancelled) {
                setReportMeta(d.meta);
                setCompletedAt(d.completedAt);
              }
            })
            .catch(() => {});
          setReady(true);
          return;
        }
      } catch {}
      try {
        const res = await fetch(
          `/api/tests/assignments/complete?token=${encodeURIComponent(token)}`
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.meta) setReportMeta(data.meta);
          if (data.completedAt) setCompletedAt(data.completedAt);
          if (data.report) {
            setReport(data.report);
            setReady(true);
            return;
          }
          if (!localProgress || Object.keys(localProgress).length === 0) {
            if (data.answers && Object.keys(data.answers).length > 0) {
              setAnswers(data.answers);
            }
          }
        }
      } catch {}
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [resultKey, progressKey, token]);

  const saveProgressToDb = useCallback(
    (next: Record<string, string>) => {
      if (progressTimer.current) clearTimeout(progressTimer.current);
      progressTimer.current = setTimeout(() => {
        fetch("/api/tests/assignments/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, answers: next }),
        }).catch(() => {});
      }, 800);
    },
    [token]
  );

  const answeredCount = ordered.filter((q) => answers[q.id]).length;
  const allAnswered = answeredCount === ordered.length;
  const current = bank[ordered[idx]?.id];
  const prevDomain = idx > 0 ? ordered[idx - 1]?.domain : undefined;
  const showIntro =
    current && ordered[idx]?.domain !== prevDomain && idx > 0;
  const meta = current ? DOMAIN_META[kind][Number(current.domain_id)] : undefined;

  function select(qid: string, optId: string) {
    const next = { ...answers, [qid]: optId };
    setAnswers(next);
    localStorage.setItem(progressKey, JSON.stringify(next));
    saveProgressToDb(next);
  }

  async function finish() {
    setSaving(true);
    const localReport = buildReport(kind, answers);
    setReport(localReport);
    localStorage.setItem(resultKey, JSON.stringify(localReport));
    try {
      const res = await fetch("/api/tests/assignments/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answers }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          setReport(data.report);
          localStorage.setItem(resultKey, JSON.stringify(data.report));
        }
        if (data.meta) setReportMeta(data.meta);
        setCompletedAt(new Date().toISOString());
      }
    } catch {}
    setSaving(false);
  }

  async function downloadPdf() {
    const sheet = sheetRef.current;
    if (!sheet || !report) return;
    setPdfBusy(true);
    try {
      const canvas = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgW = 210;
      const pageH = 297;
      const imgH = (canvas.height * imgW) / canvas.width;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(dataUrl, "JPEG", 0, 0, imgW, imgH);
      let remaining = imgH - pageH;
      let page = 1;
      while (remaining > 0) {
        pdf.addPage();
        pdf.addImage(dataUrl, "JPEG", 0, -(pageH * page), imgW, imgH);
        remaining -= pageH;
        page++;
      }
      const student = reportMeta?.studentName || "Student";
      const title = reportMeta?.testTitle || KIND_LABELS[kind];
      pdf.save(`${title} Report - ${student}.pdf`);
    } catch {}
    setPdfBusy(false);
  }

  function retake() {
    setAnswers({});
    setReport(null);
    setIdx(0);
    localStorage.removeItem(progressKey);
    localStorage.removeItem(resultKey);
    fetch("/api/tests/assignments/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, answers: {} }),
    }).catch(() => {});
  }

  if (!ready) return null;

  if (report) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>
              {report.kind === "stream"
                ? "Your Stream Recommendation"
                : report.kind === "personality"
                  ? "Your Personality Type"
                  : report.kind === "intelligences"
                    ? "Your Intelligence Profile"
                    : report.kind === "learning"
                      ? "Your Learning & Productivity Profile"
                      : "Your Ideal Career Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.kind === "stream" && (
              <p className="text-sm text-slate-600">
                Recommended stream:{" "}
                <span className="font-semibold text-primary">
                  {report.recommendedStream}
                </span>
              </p>
            )}
            {report.kind === "intelligences" && (
              <p className="text-sm text-slate-600">
                Emotional Intelligence score:{" "}
                <span className="font-semibold text-primary">
                  {report.emotionalIntelligence} / 42
                </span>
              </p>
            )}
            {report.kind === "intelligences"
              ? report.rows.map((row, i) => {
                  const pct = Math.round((row.score / row.max) * 100);
                  const band =
                    i < 3 ? "Strength" : i < 6 ? "Moderate" : "Developing";
                  return (
                    <div key={row.key}>
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>
                          {row.label}{" "}
                          <span className="text-slate-400">({band})</span>
                        </span>
                        <span>
                          {row.score}/{row.max}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              : report.kind === "personality" && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  Your personality type:{" "}
                  <span className="text-2xl font-bold tracking-widest text-primary">
                    {report.type}
                  </span>
                </p>
                {(personalityProfiles.profiles as Record<string, string>)[
                  report.type
                ] && (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                    {(personalityProfiles.profiles as Record<string, string>)[
                      report.type
                    ]
                      .split(/\n+/)
                      .map((para, i) => (
                        <p key={i} className={i > 0 ? "mt-2" : ""}>
                          {para}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}
            {report.kind === "personality"
              ? report.rows.map((row) => {
                  const total = row.first.count + row.second.count || 1;
                  const pct = Math.round((row.first.count / total) * 100);
                  return (
                    <div key={row.key}>
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>
                          {row.first.label} {row.first.count}
                        </span>
                        <span>
                          {row.second.label} {row.second.count}
                        </span>
                      </div>
                      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
                        <div
                          className="h-2 bg-slate-300"
                          style={{ width: `${100 - pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              : report.kind === "learning"
                ? report.groups.map((group) => (
                    <div key={group.name} className="mt-2 first:mt-0">
                      <h3 className="mb-2 text-sm font-medium">{group.name}</h3>
                      <div className="space-y-3">
                        {group.rows.map((row) => (
                          <div key={row.abbrev}>
                            <div className="mb-1 flex justify-between text-xs text-slate-500">
                              <span>{row.label}</span>
                              <span>{row.score}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${Math.round(row.score)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              : report.kind === "stream" || report.kind === "ideal"
                ? (report.kind === "stream" ? report.rows : report.domains).map((row) => (
              <div key={row.key}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{row.label}</span>
                  <span>
                    {row.score}/{row.max}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.round((row.score / row.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))
            : null}
            {report.kind === "personality" && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                Your preferences explained
              </div>
              {report.rows.map((row, i) => {
                const dim = (
                  personalityProfiles.dimensions as Array<{
                    name: string;
                    preferLabel: string;
                    notPreferLabel: string;
                    preferTraits: string[];
                    notPreferTraits: string[];
                  }>
                )[i];
                const prefersFirst = row.first.count >= row.second.count;
                const label = prefersFirst ? dim.preferLabel : dim.notPreferLabel;
                const traits = prefersFirst ? dim.preferTraits : dim.notPreferTraits;
                return (
                  <div key={row.key} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{dim.name}</div>
                    <div style={{ fontSize: 11.5, color: "#475569" }}>
                      You lean towards <strong>{label}</strong> — {traits.join("; ")}.
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {report.kind === "ideal" && (
              <div>
                <h3 className="mb-2 text-sm font-medium">Top strengths</h3>
                <ul className="list-inside list-disc text-sm text-slate-600">
                  {report.strengths.map((s) => (
                    <li key={s.label}>
                      {s.label} — {s.pct}%
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={downloadPdf} disabled={pdfBusy}>
                {pdfBusy ? "Preparing PDF…" : "Download PDF"}
              </Button>
              <Button variant="outline" onClick={retake}>
                Retake test
              </Button>
            </div>
          </CardContent>
        </Card>

        <div
          ref={sheetRef}
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: 794,
            background: "#ffffff",
            color: "#1e293b",
            fontFamily: "Arial, Helvetica, sans-serif",
            padding: "48px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #2563eb", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {reportMeta?.logoUrl && (
                <img
                  src={reportMeta.logoUrl}
                  alt="logo"
                  style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain" }}
                />
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {reportMeta?.brandName || "Career Assessment"}
                </div>
                {reportMeta?.counselorName && (
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Counselor: {reportMeta.counselorName}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#64748b" }}>
              {completedAt && new Date(completedAt).toLocaleDateString()}
            </div>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "28px 0 4px" }}>
            {(reportMeta?.testTitle || KIND_LABELS[kind]) + " Report"}
          </h1>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: 24 }}>
            Student: <strong>{reportMeta?.studentName || "Student"}</strong>
          </div>

          {report.kind === "stream" && (
            <div style={{ marginBottom: 16, padding: 16, background: "#eff6ff", borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>Recommended stream</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#2563eb" }}>
                {report.recommendedStream}
              </div>
            </div>
          )}
          {report.kind === "personality" && (
            <div style={{ marginBottom: 16, padding: 16, background: "#eff6ff", borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>Personality type</div>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4, color: "#2563eb" }}>
                {report.type}
              </div>
            </div>
          )}
          {report.kind === "personality" &&
            (personalityProfiles.profiles as Record<string, string>)[report.type] && (
              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "#334155",
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                {(personalityProfiles.profiles as Record<string, string>)[report.type]
                  .split(/\n+/)
                  .map((para: string, i: number) => (
                    <p key={i} style={{ margin: i > 0 ? "8px 0 0" : 0 }}>
                      {para}
                    </p>
                  ))}
              </div>
            )}
          {report.kind === "intelligences" && (
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              Emotional Intelligence score:{" "}
              <strong style={{ color: "#2563eb" }}>
                {report.emotionalIntelligence} / 42
              </strong>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {report.kind === "learning"
              ? report.groups.map((group) => (
                  <div key={group.name} style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                      {group.name}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {group.rows.map((row) => (
                        <div key={row.abbrev}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                            <span>{row.label}</span>
                            <span>{row.score}%</span>
                          </div>
                          <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5 }}>
                            <div style={{ height: 10, width: `${Math.round(row.score)}%`, background: "#2563eb", borderRadius: 5 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              : report.kind === "intelligences"
              ? report.rows.map((row, i) => {
                  const pct = Math.round((row.score / row.max) * 100);
                  const band = i < 3 ? "Strength" : i < 6 ? "Moderate" : "Developing";
                  return (
                    <div key={row.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                        <span>
                          {row.label} <span style={{ color: "#94a3b8" }}>({band})</span>
                        </span>
                        <span>
                          {row.score}/{row.max}
                        </span>
                      </div>
                      <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5 }}>
                        <div style={{ height: 10, width: `${pct}%`, background: "#2563eb", borderRadius: 5 }} />
                      </div>
                    </div>
                  );
                })
              : report.kind === "personality"
                ? report.rows.map((row) => {
                    const total = row.first.count + row.second.count || 1;
                    const pct = Math.round((row.first.count / total) * 100);
                    return (
                      <div key={row.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                          <span>{`${row.first.label} ${row.first.count}`}</span>
                          <span>{`${row.second.label} ${row.second.count}`}</span>
                        </div>
                        <div style={{ display: "flex", height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden" }}>
                          <div style={{ height: 10, width: `${pct}%`, background: "#2563eb" }} />
                          <div style={{ height: 10, width: `${100 - pct}%`, background: "#94a3b8" }} />
                        </div>
                      </div>
                    );
                  })
                : (report.kind === "stream" ? report.rows : report.domains).map((row) => {
                    const pct = Math.round((row.score / row.max) * 100);
                    return (
                      <div key={row.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 4 }}>
                          <span>{row.label}</span>
                          <span>
                            {row.score}/{row.max}
                          </span>
                        </div>
                        <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5 }}>
                          <div style={{ height: 10, width: `${pct}%`, background: "#2563eb", borderRadius: 5 }} />
                        </div>
                      </div>
                    );
                  })}
          </div>

          {report.kind === "ideal" && report.strengths.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Top strengths</div>
              <ul style={{ fontSize: 12.5, color: "#475569", paddingLeft: 18, margin: 0 }}>
                {report.strengths.map((s) => (
                  <li key={s.label}>
                    {s.label} — {s.pct}%
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ marginTop: 40, borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 10.5, color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
            <span>{reportMeta?.brandName || "Career Assessment Platform"}</span>
            <span>Generated {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>
            Question {idx + 1} of {ordered.length}
          </span>
          <span>
            {answeredCount}/{ordered.length} answered
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((answeredCount / ordered.length) * 100)}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{meta?.label}</Badge>
          </div>
          {showIntro && meta?.intro && (
            <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-800">
              {meta.intro}
            </p>
          )}
          <CardTitle className="whitespace-pre-line text-lg leading-relaxed">
            {current.question?.trim() ||
              (kind === "personality"
                ? "Which statement sounds more like you?"
                : "Choose your answer")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {current.media_path && (
            <img
              src={current.media_path}
              alt={`Question figure`}
              className="max-h-72 rounded-lg border border-slate-200 bg-white object-contain p-2"
            />
          )}
          {(orderedOptions(current).length === 7 && kind === "intelligences") ||
          (orderedOptions(current).length === 5 && kind === "learning") ? (
            <div className="flex flex-wrap items-center justify-between gap-2 py-2">
              {orderedOptions(current).map((o) => {
                const selected = answers[String(current.id)] === String(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => select(String(current.id), String(o.id))}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                    }`}
                    title={o.answer}
                  >
                    {o.marks}
                  </button>
                );
              })}
              <div className="flex w-full justify-between text-[11px] text-slate-400">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>
            </div>
          ) : orderedOptions(current).length === 7 &&
            kind === "intelligences" ? (
            <div className="flex flex-wrap items-center justify-between gap-2 py-2">
              {orderedOptions(current).map((o) => {
                const selected = answers[String(current.id)] === String(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => select(String(current.id), String(o.id))}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600"
                    }`}
                    title={o.answer}
                  >
                    {o.marks}
                  </button>
                );
              })}
              <div className="flex w-full justify-between text-[11px] text-slate-400">
                <span>Not at All</span>
                <span>Completely</span>
              </div>
            </div>
          ) : (
            orderedOptions(current).map((o) => {
              const selected = answers[String(current.id)] === String(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => select(String(current.id), String(o.id))}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    selected
                      ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {o.media_path ? (
                    <img
                      src={o.media_path}
                      alt={`Option`}
                      className="mx-auto max-h-24 object-contain"
                    />
                  ) : (
                    o.answer
                  )}
                </button>
              );
            })
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              disabled={idx === 0}
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
            >
              Back
            </Button>
            {idx < ordered.length - 1 ? (
              <Button onClick={() => setIdx((i) => i + 1)}>Next</Button>
            ) : (
              <Button disabled={!allAnswered || saving} onClick={finish}>
                {saving ? "Saving…" : "Finish & see report"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-400">
        Answers are saved automatically to your account — close this page and resume
        on any device with the same link.
      </p>
    </div>
  );
}
