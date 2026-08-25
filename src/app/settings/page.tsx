"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageCircle, IndianRupee, Smartphone, Save, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BrandingCard } from "@/components/branding-card";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const isCounselor = session?.user?.role === "COUNSELOR";


  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [counsellingPrice, setCounsellingPrice] = useState("2000");
  const [assessmentPrice, setAssessmentPrice] = useState("4000");
  const [indiaPrice, setIndiaPrice] = useState("14000");
  const [internationalPrice, setInternationalPrice] = useState("95000");
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    if (!isCounselor) { setLoading(false); return; }
    fetch("/api/counselor/profile").then((r) => r.json()).then((data) => {
      const p = data.profile;
      if (p) {
        setProfile(p);
        setTitle(p.title || "");
        setPhone(p.phone || "");
        setWhatsappCountryCode(p.whatsappCountryCode || "");
        setWhatsappNumber(p.whatsappNumber || "");
        setCounsellingPrice(String(p.counsellingPrice ?? 2000));
        setAssessmentPrice(String(p.assessmentPrice ?? 4000));
        setIndiaPrice(String(p.indiaPrice ?? 14000));
        setInternationalPrice(String(p.internationalPrice ?? 95000));
        setUpiId(p.upiId || "");
      }
      setLoading(false);
    });
  }, [isCounselor]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/counselor/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, phone, whatsappCountryCode, whatsappNumber,
        counsellingPrice, assessmentPrice, indiaPrice, internationalPrice, upiId,
      }),
    });
    if (res.ok) setSaved(true);
    setSaving(false);
  }

if (!isSuperAdmin && !isCounselor) {
    return (
      <div className="p-6 pt-20 max-w-2xl mx-auto space-y-6">
        <PageHeader icon={Settings2} title="Settings" description="Manage your account" eyebrow="Account" />
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Logged in as {session?.user?.email} ({session?.user?.role})</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 max-w-2xl mx-auto space-y-6">
<PageHeader icon={Settings2} title="Settings" description="Manage your appointments and portal settings" eyebrow="Account" />

      {isSuperAdmin && <BrandingCard />}

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Logged in as {session?.user?.email} ({session?.user?.role})</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Contact Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Counselor" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp</p>
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
            {whatsappCountryCode && whatsappNumber && (
              <a href={`https://wa.me/${whatsappCountryCode}${whatsappNumber}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-green-600 hover:underline">
                <MessageCircle className="h-4 w-4" /> https://wa.me/{whatsappCountryCode}{whatsappNumber}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><IndianRupee className="h-5 w-5" /> Service Pricing</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Counselling (Rs)</label>
              <Input type="number" value={counsellingPrice} onChange={(e) => setCounsellingPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">+ Assessment (Rs)</label>
              <Input type="number" value={assessmentPrice} onChange={(e) => setAssessmentPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">India (Rs)</label>
              <Input type="number" value={indiaPrice} onChange={(e) => setIndiaPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">International (Rs)</label>
              <Input type="number" value={internationalPrice} onChange={(e) => setInternationalPrice(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>UPI ID</CardTitle></CardHeader>
        <CardContent>
          <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="counselor@upi" />
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
        {saved && <p className="text-sm text-green-600">Saved successfully!</p>}
      </div>
    </div>
  );
}

