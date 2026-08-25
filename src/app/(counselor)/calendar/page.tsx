"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Calendar, CheckCircle2, XCircle, Clock, ExternalLink, Loader2, MessageSquare, Download, IndianRupee, Eye, type LucideIcon } from "lucide-react";

interface PaymentProof {
  id: string;
  fileUrl: string;
  fileName: string;
  verified: boolean;
  expiresAt: string;
}

interface Appointment {
  id: string;
  title: string;
  package: string | null;
  description: string | null;
  startTime: string;
  endTime: string;
  meetLink: string | null;
  amount: number | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  student: { user: { firstName: string; lastName: string; email: string } };
  paymentProof: PaymentProof | null;
}

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetLinks, setMeetLinks] = useState<Record<string, string>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/appointments");
    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAppointments() }, [fetchAppointments]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, meetLink: meetLinks[id] || null }),
    });
    setMeetLinks((prev) => ({ ...prev, [id]: "" }));
    await fetchAppointments();
    setUpdating(null);
  }

  async function verifyPayment(proofId: string, appointmentId: string) {
    setUpdating(appointmentId);
    await fetch(`/api/payment-proof/${proofId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified: true }),
    });
    await fetchAppointments();
    setUpdating(null);
  }

  function viewProof(url: string) {
    setPreviewUrl(url);
  }

  const groups: Record<string, Appointment[]> = { PENDING: [], CONFIRMED: [], COMPLETED: [], CANCELLED: [] };
  appointments.forEach((a) => { (groups[a.status] || groups.PENDING).push(a); });

  const statusMeta: Record<string, { chip: string; text: string; label: string }> = {
    PENDING: { chip: "from-amber-400 to-orange-500", text: "text-amber-600", label: "Pending" },
    CONFIRMED: { chip: "from-emerald-400 to-teal-600", text: "text-emerald-600", label: "Confirmed" },
    COMPLETED: { chip: "from-blue-400 to-blue-600", text: "text-blue-600", label: "Completed" },
    CANCELLED: { chip: "from-gray-400 to-gray-500", text: "text-muted-foreground", label: "Cancelled" },
  };
  const statusIcon: Record<string, LucideIcon> = {
    PENDING: Clock,
    CONFIRMED: CheckCircle2,
    COMPLETED: CheckCircle2,
    CANCELLED: XCircle,
  };

  return (
    <div className="space-y-6 p-6 pt-20 max-w-5xl mx-auto">
      <PageHeader
        icon={Calendar}
        title="Calendar"
        description="Manage appointment requests from your students"
        eyebrow="Counselor"
      />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/25">
              <Calendar className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No appointments yet</p>
            <p className="text-xs text-muted-foreground/70">Your students' session requests will appear here as soon as they book.</p>
          </CardContent>
        </Card>
      ) : (
        ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((status) => {
          const list = groups[status];
          if (list.length === 0) return null;
          return (
            <Card key={status} className="overflow-hidden border-border/70">
              <CardHeader className="border-b bg-muted/40 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${statusMeta[status].chip} text-white shadow-sm`}>
                    {(() => { const Icon = statusIcon[status]; return <Icon className="h-4 w-4" />; })()}
                  </span>
                  <span className={`${statusMeta[status].text}`}>{statusMeta[status].label}</span>
                </CardTitle>
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-muted-foreground ring-1 ring-border/60">
                  {list.length}
                </span>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {list.map((appt) => (
                  <div key={appt.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{appt.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {appt.student.user.firstName} {appt.student.user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(appt.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
                          {new Date(appt.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          {" — "}
                          {new Date(appt.endTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {appt.amount && (
                          <p className="text-xs font-medium text-accent mt-1 flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" /> Rs {appt.amount?.toLocaleString()}
                          </p>
                        )}
                        {appt.description && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {appt.description}
                          </p>
                        )}
                        {appt.meetLink && (
                          <a href={appt.meetLink} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline inline-flex items-center gap-1 mt-1">
                            <ExternalLink className="h-3 w-3" /> Join Meeting
                          </a>
                        )}

                        {appt.paymentProof && (
                          <div className="mt-2 pt-2 border-t flex items-center gap-3">
                            <button onClick={() => viewProof(appt.paymentProof!.fileUrl)}
                              className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" /> View Payment Proof
                            </button>
                            <a href={appt.paymentProof.fileUrl} download={appt.paymentProof.fileName}
                              className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                              <Download className="h-3 w-3" /> Download
                            </a>
                            {!appt.paymentProof.verified && (
                              <span className="text-[10px] text-muted-foreground">
                                Auto-deletes {new Date(appt.paymentProof.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        {appt.status === "PENDING" && (
                          <>
                            <div className="space-y-1">
                              <Input placeholder="Meet link" value={meetLinks[appt.id] || ""}
                                onChange={(e) => setMeetLinks((prev) => ({ ...prev, [appt.id]: e.target.value }))}
                                className="h-8 text-xs w-44" />
                            </div>
                            {appt.paymentProof && !appt.paymentProof.verified ? (
                              <Button size="sm" disabled={updating === appt.id}
                                onClick={() => verifyPayment(appt.paymentProof!.id, appt.id)}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Verify & Confirm
                              </Button>
                            ) : (
                              <Button size="sm" variant="default" disabled={updating === appt.id}
                                onClick={() => updateStatus(appt.id, "CONFIRMED")}>
                                {updating === appt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                                Confirm
                              </Button>
                            )}
                            <Button size="sm" variant="outline" disabled={updating === appt.id}
                              onClick={() => updateStatus(appt.id, "CANCELLED")}>
                              Decline
                            </Button>
                          </>
                        )}
                        {appt.status === "CONFIRMED" && (
                          <Button size="sm" variant="outline" disabled={updating === appt.id}
                            onClick={() => updateStatus(appt.id, "COMPLETED")}>
                            {updating === appt.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })
      )}

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewUrl(null)}>
          <div className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()}>
            {previewUrl.startsWith("data:application/pdf") ? (
              <iframe src={previewUrl} title="Payment proof" className="h-[80vh] w-[90vw] max-w-4xl rounded-xl bg-white shadow-2xl" />
            ) : (
              <img src={previewUrl} alt="Payment proof" className="max-h-[80vh] max-w-full rounded-xl shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
