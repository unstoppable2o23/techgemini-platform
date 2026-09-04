"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InviteState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "expired"; message: string }
  | { phase: "form"; studentName: string }
  | { phase: "success"; email: string };

export function InviteClient({ token }: { token: string }) {
  const router = useRouter();
  const next = useMemo(() => "/dashboard", []);

  const [state, setState] = useState<InviteState>({ phase: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ phase: "error", message: "Missing invitation link." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.valid) {
          setState({ phase: "form", studentName: data.studentName });
        } else {
          const msg =
            data?.reason === "ALREADY_ACCEPTED"
              ? "This invitation has already been used. Please sign in with the password you set."
              : data?.reason === "EXPIRED"
              ? "This invitation has expired. Please ask your counselor or organization to send a new one."
              : "This invitation is not valid. Please check the link or ask your counselor.";
          setState({ phase: "expired", message: msg });
        }
      } catch {
        if (!cancelled) setState({ phase: "error", message: "Could not reach the server. Try again." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/invitations/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.ok) {
      setState({ phase: "success", email: data.email });
    } else {
      setError(data.error || "Could not complete setup. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" /> Student Invitation
          </CardTitle>
          <CardDescription>Set up your TechGemini account securely.</CardDescription>
        </CardHeader>
        <CardContent>
          {state.phase === "loading" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Checking invitation…
            </div>
          )}

          {state.phase === "error" && (
            <div className="text-center">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}

          {state.phase === "expired" && (
            <div className="text-center">
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
              <Button className="mt-4 w-full" onClick={() => router.push("/auth/login")}>
                Go to Sign In
              </Button>
            </div>
          )}

          {state.phase === "form" && (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Hi {state.studentName}, welcome to TechGemini. Create your own password — it is never
                sent over email or shared with anyone.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="pwd">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pwd" type="password" className="pl-9" value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                    required minLength={8} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pwd2">Confirm Password</Label>
                <Input id="pwd2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? "Setting up…" : "Create Account"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                After setup you will sign in with this email and password.
              </p>
            </form>
          )}

          {state.phase === "success" && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
              <p className="mt-3 font-medium">Your account is ready!</p>
              <p className="text-sm text-muted-foreground">
                Sign in with <span className="font-mono">{state.email}</span> and the password you set.
              </p>
              <Button className="mt-4 w-full" onClick={() => router.push(`/auth/login?next=${next}`)}>
                Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
