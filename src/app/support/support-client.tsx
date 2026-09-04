"use client";

import { useState } from "react";
import { LifeBuoy, Bug, Headphones, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Mode = "HELP" | "PROBLEM" | "CONTACT";

export function SupportClient() {
  const [mode, setMode] = useState<Mode>("HELP");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const MODE_META: Record<Mode, { label: string; icon: any }> = {
    HELP: { label: "Help & How-to", icon: LifeBuoy },
    PROBLEM: { label: "Report a Problem", icon: Bug },
    CONTACT: { label: "Contact Support", icon: Headphones },
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!subject.trim()) {
      setMsg({ error: "Please enter a short subject." });
      return;
    }
    setLoading(true);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: mode, subject, description }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMsg({ ok: data.message });
      setSubject("");
      setDescription("");
    } else {
      setMsg({ error: data.error || "Could not submit. Please try again." });
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 pt-24">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-5 w-5" /> Help & Support
          </CardTitle>
          <CardDescription>
            Get help, report a problem, or contact the SUHAIL team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(["HELP", "PROBLEM", "CONTACT"] as Mode[]).map((m) => {
              const Icon = MODE_META[m].icon;
              return (
                <Button
                  key={m}
                  variant={mode === m ? "default" : "outline"}
                  onClick={() => setMode(m)}
                  className="gap-2"
                  type="button"
                >
                  <Icon className="h-4 w-4" /> {MODE_META[m].label}
                </Button>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            {mode === "PROBLEM"
              ? "Please describe what happened, what you expected, and any steps to reproduce it."
              : mode === "CONTACT"
              ? "Reach out to our team and we will get back to you."
              : "Tell us what you need help with and we will point you to the right resource."}
          </p>

          {mode === "CONTACT" && (
            <div className="grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              <p><span className="font-medium">Email:</span> support@suhail.local (your account manager for pilot)</p>
              <p><span className="font-medium">Response:</span> within 1 business day during the pilot.</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="Short summary of your request" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more detail about the problem or request" />
            </div>
            {msg?.error && <p className="text-sm text-destructive">{msg.error}</p>}
            {msg?.ok && (
              <p className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> {msg.ok}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Submitting…" : "Submit"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Your organization and user details are attached automatically so our team can help faster.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
