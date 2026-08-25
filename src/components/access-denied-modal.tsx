"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface DeniedItem {
  label: string;
  href: string;
  featureKey?: string;
}

export function AccessDeniedModal() {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<DeniedItem | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setItem(e.detail);
      setOpen(true);
      setSent(false);
      setError("");
    };
    window.addEventListener("open-access-denied", handler as EventListener);
    return () =>
      window.removeEventListener("open-access-denied", handler as EventListener);
  }, []);

  async function requestAccess() {
    if (!item) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/student/request-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureName: item.label }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send request");
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSent(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            {sent ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <DialogTitle className="text-center">
            {sent ? "Request Sent" : "Access Required"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {sent ? (
              "Your counselor has been notified and will review your request shortly."
            ) : item ? (
              <>
                <strong>{item.label}</strong> is not yet enabled for your
                account. Contact your counselor to request access.
              </>
            ) : (
              "This feature is not enabled for your account."
            )}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive justify-center">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        <DialogFooter className="flex sm:justify-center gap-2">
          {!sent ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Go Back
              </Button>
              <Button onClick={requestAccess} disabled={sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : null}
                Request Access from Counselor
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpen(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
