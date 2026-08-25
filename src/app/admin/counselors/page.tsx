"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/page-header";
import { BrandingCard } from "@/components/branding-card";
import { Users, Plus, Loader2, UserPlus, IndianRupee, MessageCircle, Megaphone, Pencil, ImagePlus, X } from "lucide-react";

export default function AdminCounselorsPage() {
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("91");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [counsellingPrice, setCounsellingPrice] = useState("2000");
  const [assessmentPrice, setAssessmentPrice] = useState("4000");
  const [indiaPrice, setIndiaPrice] = useState("14000");
  const [internationalPrice, setInternationalPrice] = useState("95000");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ success?: string; error?: string } | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState<string | null>(null);
  const [logoError, setLogoError] = useState("");

  const [editResult, setEditResult] = useState<{ success?: string; error?: string } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/counselors");
      if (res.ok) {
        const data = await res.json();
        setCounselors(data.counselors || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (!firstName || !lastName || !email || !password) {
      setResult({ error: "All fields are required" });
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/admin/counselors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password, title, phone, whatsappCountryCode, whatsappNumber, counsellingPrice, assessmentPrice, indiaPrice, internationalPrice }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult({ success: `Counselor ${firstName} ${lastName} created` });
      setFirstName(""); setLastName(""); setEmail(""); setPassword(""); setTitle(""); setPhone("");
      setWhatsappCountryCode("91"); setWhatsappNumber("");
      setCounsellingPrice("2000"); setAssessmentPrice("4000"); setIndiaPrice("14000"); setInternationalPrice("95000");
      setShowForm(false);
      setCounselors((prev) => [...prev, data.user]);
    } else {
      setResult({ error: data.error || "Failed to create counselor" });
    }
    setSubmitting(false);
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    setBroadcastResult(null);
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      setBroadcastResult({ error: "Title and message are required" });
      return;
    }
    setBroadcasting(true);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage }),
    });
    const data = await res.json();
    if (res.ok) {
      setBroadcastResult({ success: `Notification sent to ${data.count} counselor(s)` });
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastOpen(false);
    } else {
      setBroadcastResult({ error: data.error || "Failed to send" });
    }
    setBroadcasting(false);
  }

  function openEdit(c: any) {
    const p = c.counselorProfile || {};
    setEditTarget(c);
    setEditForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      title: p.title || "",
      phone: p.phone || "",
      whatsappCountryCode: p.whatsappCountryCode || "91",
      whatsappNumber: p.whatsappNumber || "",
      counsellingPrice: String(p.counsellingPrice ?? 2000),
      assessmentPrice: String(p.assessmentPrice ?? 4000),
      indiaPrice: String(p.indiaPrice ?? 14000),
      internationalPrice: String(p.internationalPrice ?? 95000),
      upiId: p.upiId || "",
      isActive: c.isActive !== false,
    });
    setEditResult(null);
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setEditSaving(true);
    setEditResult(null);
    const res = await fetch(`/api/admin/counselors/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (res.ok) {
      setEditResult({ success: "Updated successfully" });
      setCounselors((prev) => prev.map((c) => c.id === editTarget.id ? data.user : c));
      setTimeout(() => setEditTarget(null), 1000);
    } else {
      setEditResult({ error: data.error || "Failed to update" });
    }
    setEditSaving(false);
  }

  async function toggleCounselorStatus(c: any) {
    const newVal = !c.isActive;
    setCounselors((prev) => prev.map((x) => x.id === c.id ? { ...x, isActive: newVal } : x));
    await fetch(`/api/admin/counselors/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: newVal }),
    });
  }

  const uploadInputRef = useRef<HTMLInputElement>(null);

  function openLogoUpload(c: any) {
    setLogoError("");
    setUploadTarget(c.id);
    uploadInputRef.current?.click();
  }

  async function handleLogoUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const id = uploadTarget;
    const file = e.target.files?.[0];
    if (!id || !file) return;
    const counselor = counselors.find((x) => x.id === id);
    if (!counselor) return;
    setLogoUploading(counselor.firstName || counselor.id);
    setLogoError("");
    try {
      const dataUrl = await compressFile(file);
      const res = await fetch(`/api/admin/counselors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: dataUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounselors((prev) => prev.map((x) => (x.id === id ? data.user : x)));
      } else {
        setLogoError("Failed to set logo");
      }
    } catch {
      setLogoError("Failed to set logo");
    }
    setLogoUploading(null);
    setUploadTarget(null);
    e.target.value = "";
  }

  async function clearLogoFor(c: any) {
    const res = await fetch(`/api/admin/counselors/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: null }),
    });
    if (res.ok) {
      const data = await res.json();
      setCounselors((prev) => prev.map((x) => (x.id === c.id ? data.user : x)));
    }
  }

  return (
    <div className="space-y-6 p-6 pt-20 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader icon={Users} title="Manage Counselors" description="Create and manage counselor accounts" eyebrow="Admin" />
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : <><UserPlus className="h-4 w-4 mr-2" /> Add Counselor</>}
        </Button>
      </div>

      <BrandingCard />

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Counselor</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title (optional)</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Counselor" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone (optional)</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1"><MessageCircle className="h-4 w-4" /> WhatsApp</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Country Code</label>
                    <Input value={whatsappCountryCode} onChange={(e) => setWhatsappCountryCode(e.target.value)} placeholder="91" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Phone Number</label>
                    <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="9876543210" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Service Pricing (defaults)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Counselling</label>
                    <Input type="number" value={counsellingPrice} onChange={(e) => setCounsellingPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Counselling + Assessment</label>
                    <Input type="number" value={assessmentPrice} onChange={(e) => setAssessmentPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">India Admission</label>
                    <Input type="number" value={indiaPrice} onChange={(e) => setIndiaPrice(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">International</label>
                    <Input type="number" value={internationalPrice} onChange={(e) => setInternationalPrice(e.target.value)} />
                  </div>
                </div>
              </div>
              {result?.error && <p className="text-sm text-destructive">{result.error}</p>}
              {result?.success && <p className="text-sm text-green-600">{result.success}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create Counselor
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={() => setBroadcastOpen(!broadcastOpen)}>
          <Megaphone className="h-4 w-4 mr-2" />
          {broadcastOpen ? "Close" : "Broadcast Notification"}
        </Button>
      </div>

      {broadcastOpen && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" /> Send Notification to All Counselors</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. System Maintenance" />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Describe the issue or update..."
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-y" />
              </div>
              {broadcastResult?.error && <p className="text-sm text-destructive">{broadcastResult.error}</p>}
              {broadcastResult?.success && <p className="text-sm text-green-600">{broadcastResult.success}</p>}
              <Button type="submit" disabled={broadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}>
                {broadcasting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
                Send to All Counselors
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All Counselors</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : counselors.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No counselors yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Counselling</TableHead>
                  <TableHead className="text-right">+ Assessment</TableHead>
                  <TableHead className="text-right">India</TableHead>
                  <TableHead className="text-right">International</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counselors.map((c: any) => {
                  const wa = c.counselorProfile;
                  const waLink = wa?.whatsappCountryCode && wa?.whatsappNumber
                    ? `https://wa.me/${wa.whatsappCountryCode}${wa.whatsappNumber}`
                    : null;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.counselorProfile?.title || "—"}</TableCell>
                      <TableCell>
                        {waLink ? (
                          <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
                            <MessageCircle className="h-3 w-3" /> {wa.whatsappCountryCode} {wa.whatsappNumber}
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">Rs {c.counselorProfile?.counsellingPrice?.toLocaleString() || "2,000"}</TableCell>
                      <TableCell className="text-right">Rs {c.counselorProfile?.assessmentPrice?.toLocaleString() || "4,000"}</TableCell>
                      <TableCell className="text-right">Rs {c.counselorProfile?.indiaPrice?.toLocaleString() || "14,000"}</TableCell>
                      <TableCell className="text-right">Rs {c.counselorProfile?.internationalPrice?.toLocaleString() || "95,000"}</TableCell>
                       <TableCell>
                        <Switch checked={c.isActive !== false} onCheckedChange={() => toggleCounselorStatus(c)} />
                      </TableCell>
                      <TableCell>
                        {c.logoUrl ? (
                          <div className="flex items-center gap-2">
                            <img src={c.logoUrl} alt="logo" className="h-8 w-8 rounded object-contain" />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => clearLogoFor(c)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => openLogoUpload(c)}>
                            <ImagePlus className="h-4 w-4 mr-1" /> Set Logo
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Counselor</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">First Name</label>
                  <Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Last Name</label>
                  <Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">New Password (leave blank to keep)</label>
                <Input type="password" value={editForm.password || ""} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Min 6 chars" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1"><MessageCircle className="h-4 w-4" /> WhatsApp</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Country Code</label>
                    <Input value={editForm.whatsappCountryCode} onChange={(e) => setEditForm({ ...editForm, whatsappCountryCode: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Number</label>
                    <Input value={editForm.whatsappNumber} onChange={(e) => setEditForm({ ...editForm, whatsappNumber: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-1"><IndianRupee className="h-4 w-4" /> Pricing</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Counselling</label>
                    <Input type="number" value={editForm.counsellingPrice} onChange={(e) => setEditForm({ ...editForm, counsellingPrice: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">+ Assessment</label>
                    <Input type="number" value={editForm.assessmentPrice} onChange={(e) => setEditForm({ ...editForm, assessmentPrice: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">India</label>
                    <Input type="number" value={editForm.indiaPrice} onChange={(e) => setEditForm({ ...editForm, indiaPrice: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">International</label>
                    <Input type="number" value={editForm.internationalPrice} onChange={(e) => setEditForm({ ...editForm, internationalPrice: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">UPI ID</label>
                <Input value={editForm.upiId} onChange={(e) => setEditForm({ ...editForm, upiId: e.target.value })} placeholder="counselor@upi" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Active</label>
                <Switch checked={editForm.isActive} onCheckedChange={(v) => setEditForm({ ...editForm, isActive: v })} />
              </div>
              {editResult?.error && <p className="text-sm text-destructive">{editResult.error}</p>}
              {editResult?.success && <p className="text-sm text-green-600">{editResult.success}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoUploadChange}
      />
    </div>
  );
}

function compressFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 512;
        let { width, height } = img;
        const scale = Math.min(1, MAX_DIM / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const out =
          file.type === "image/png" || dataUrl.startsWith("data:image/png")
            ? canvas.toDataURL("image/png")
            : canvas.toDataURL("image/jpeg", 0.92);
        resolve(out);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

