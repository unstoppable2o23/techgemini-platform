"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CareerPreferencesForm, type CareerPrefsValues } from "@/components/career-preferences/career-preferences-form";

export function CareerPreferencesEditor({
  title,
  description,
  initial,
  isNew,
}: {
  title: string;
  description: string;
  initial: Partial<CareerPrefsValues>;
  isNew: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSave(values: CareerPrefsValues) {
    setSaving(true);
    try {
      const res = await fetch("/api/student/career-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      if (isNew) {
        router.push("/dashboard");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setSaving(false);
      alert(err.message);
    }
  }

  return (
    <CareerPreferencesForm
      title={title}
      description={description}
      initial={initial}
      submitting={saving}
      submitLabel={isNew ? "Next" : "Save Changes"}
      onSave={handleSave}
    />
  );
}