"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ImagePlus, Save, Trash2 } from "lucide-react";

export function BrandingCard() {
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tenant/branding")
      .then((r) => r.json())
      .then((data) => {
        const t = data.tenant;
        if (t) {
          setBrandName(t.brandName || "");
          setLogoUrl(t.logoUrl || "");
          setLogoPreview(t.logoUrl || "");
        }
      })
      .catch(() => setError("Failed to load branding"))
      .finally(() => setLoading(false));
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      compressImage(url, file.type).then((compressed) => {
        setLogoPreview(compressed);
        setLogoUrl(compressed);
        setError("");
      });
    };
    reader.readAsDataURL(file);
  }

  function compressImage(dataUrl: string, mime: string): Promise<string> {
    return new Promise((resolve) => {
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
        const isPng = mime === "image/png" || dataUrl.startsWith("data:image/png");
        const out = isPng
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", 0.92);
        resolve(out);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch("/api/tenant/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName, logoUrl }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaved(true);
      setLogoUrl(data.tenant.logoUrl || "");
      setLogoPreview(data.tenant.logoUrl || "");
      window.location.reload();
    } else {
      setError(data.error || "Failed to save branding");
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5 text-accent" />
          Branding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
            ) : (
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
              >
                <ImagePlus className="h-4 w-4 mr-1" />
                Upload Logo
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLogoUrl("");
                    setLogoPreview("");
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <p className="text-xs text-muted-foreground">PNG, JPG or SVG · max 2MB</p>
          </div>
        </div>

        <div className="max-w-md">
          <label className="text-sm font-medium">Brand Name</label>
          <Input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Your brand name"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Shown in the page title and login screen.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-green-600">Branding saved successfully!</p>}

        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Branding
        </Button>
      </CardContent>
    </Card>
  );
}