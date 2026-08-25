"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, User, MessageSquare, CheckCircle2, XCircle, Loader2, ExternalLink, Plus, Download, IndianRupee } from "lucide-react";

const PACKAGES = [
  { key: "counselling", label: "Counselling Session", priceKey: "counsellingPrice" },
  { key: "assessment", label: "Counselling + Assessment", priceKey: "assessmentPrice" },
  { key: "india", label: "India (Counselling + Assessment + Admission Assistance)", priceKey: "indiaPrice" },
  { key: "international", label: "International (Counselling + Assessment + Admission Assistance)", priceKey: "internationalPrice" },
];

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
  counselor: { firstName: string; lastName: string; email: string };
  paymentProof?: { id: string; verified: boolean; fileName: string; expiresAt: string } | null;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [counselor, setCounselor] = useState<{
    user: { firstName: string; lastName: string; email: string };
    title: string | null;
    counsellingPrice: number;
    assessmentPrice: number;
    indiaPrice: number;
    internationalPrice: number;
    upiId: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/appointments");
    const data = await res.json();
    setAppointments(data.appointments || []);
    setCounselor(data.counselor);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData() }, [fetchData]);

  function getPrice(pkg: string): number {
    if (!counselor) return 0;
    const p = PACKAGES.find((p) => p.key === pkg);
    if (!p) return 0;
    return (counselor as any)[p.priceKey] || 0;
  }

  function getPackageLabel(key: string): string {
    return PACKAGES.find((p) => p.key === key)?.label || key;
  }

  const selectedPrice = selectedPackage ? getPrice(selectedPackage) : 0;

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedPackage || !date || !startTime || !endTime) {
      setError("Please fill in all required fields");
      return;
    }

    const title = selectedPackage === "other" ? customTitle : getPackageLabel(selectedPackage);
    if (!title) { setError("Please enter a title"); return; }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (end <= start) { setError("End time must be after start time"); return; }
    if (start <= new Date()) { setError("Please pick a future date and time"); return; }

    setSubmitting(true);
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        package: selectedPackage,
        description,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        amount: selectedPrice || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to book appointment");
      setSubmitting(false);
      return;
    }

    setSuccess("Appointment requested! Complete payment to confirm.");
    setSelectedPackage("");
    setCustomTitle("");
    setDescription("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setSubmitting(false);
    await fetchData();
  }

  async function handlePaymentUpload(appointmentId: string, file: File) {
    setUploadingId(appointmentId);
    const formData = new FormData();
    formData.append("appointmentId", appointmentId);
    formData.append("file", file);
    const res = await fetch("/api/payment-proof", { method: "POST", body: formData });
    if (res.ok) await fetchData();
    setUploadingId(null);
  }

  const statusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      PENDING: { label: "Pending Payment", variant: "outline" },
      CONFIRMED: { label: "Confirmed", variant: "default" },
      COMPLETED: { label: "Completed", variant: "secondary" },
      CANCELLED: { label: "Cancelled", variant: "destructive" },
    };
    const c = config[status] || config.PENDING;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6 p-6 pt-20 max-w-4xl mx-auto">
      <PageHeader
          icon={Calendar}
          title="Appointments"
          description="Book one-on-one sessions with your counselor"
          eyebrow="Student"
          actions={
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? "Cancel" : "Book Session"}
            </Button>
          }
        />

      {counselor && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <User className="h-10 w-10 text-accent bg-accent/10 rounded-full p-2" />
              <div>
                <p className="font-medium">{counselor.user.firstName} {counselor.user.lastName}</p>
                <p className="text-sm text-muted-foreground">{counselor.title || "Counselor"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Counselling</p>
                <p className="font-semibold mt-1">Rs {counselor.counsellingPrice?.toLocaleString() || "2,000"}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Counselling + Assessment</p>
                <p className="font-semibold mt-1">Rs {counselor.assessmentPrice?.toLocaleString() || "4,000"}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">India Admission</p>
                <p className="font-semibold mt-1">Rs {counselor.indiaPrice?.toLocaleString() || "14,000"}</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">International Admission</p>
                <p className="font-semibold mt-1">Rs {counselor.internationalPrice?.toLocaleString() || "95,000"}</p>
              </div>
            </div>
            {counselor.upiId && (
              <p className="text-xs text-muted-foreground mt-3">Pay to UPI: <span className="font-mono font-medium">{counselor.upiId}</span></p>
            )}
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Book a Session</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Service Package *</label>
                <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                  <SelectTrigger>
                    <SelectValue>Select a package</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGES.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.label} — Rs {(counselor ? (counselor as any)[p.priceKey] : 0)?.toLocaleString() || "—"}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other (custom title)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPackage === "other" && (
                <div>
                  <label className="text-sm font-medium">Custom Title *</label>
                  <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Describe your session" />
                </div>
              )}

              {selectedPackage && selectedPackage !== "other" && selectedPrice > 0 && (
                <div className="bg-accent/5 rounded-lg p-3 flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Amount: Rs {selectedPrice?.toLocaleString()}</span>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What would you like to discuss?" rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Date *</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="text-sm font-medium">Start Time *</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">End Time *</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Request Appointment
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Your Appointments</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No appointments yet. Click "Book Session" to schedule one.
            </div>
          ) : (
            <div className="divide-y">
              {appointments.map((appt) => (
                <div key={appt.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{appt.title}</p>
                        {statusBadge(appt.status)}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(appt.startTime).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", year: "numeric",
                        })}
                        <Clock className="h-3 w-3 ml-2" />
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
                    </div>
                  </div>

                  {(appt.status === "PENDING" || appt.status === "CONFIRMED") && (
                    <div className="mt-3 pt-3 border-t">
                      {appt.paymentProof ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className={`h-4 w-4 ${appt.paymentProof.verified ? "text-green-500" : "text-amber-500"}`} />
                            <span>{appt.paymentProof.verified ? "Payment Verified" : "Payment Uploaded (awaiting verification)"}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Proof auto-deletes {new Date(appt.paymentProof.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      ) : appt.amount ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Pay Rs {appt.amount?.toLocaleString()} {counselor?.upiId && `to UPI: ${counselor.upiId}`} and upload the payment screenshot
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              className="text-xs h-9"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePaymentUpload(appt.id, file);
                                e.target.value = "";
                              }}
                            />
                            {uploadingId === appt.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {appt.paymentProof && !appt.paymentProof.verified && (
                    <p className="text-[10px] text-destructive mt-1">
                      Payment proof will be deleted 30 days after upload ({new Date(appt.paymentProof.expiresAt).toLocaleDateString()})
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
