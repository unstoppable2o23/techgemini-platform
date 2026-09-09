"use client";

import { Printer } from "lucide-react";

export function PrintButton({
  onPrint,
  label = "Print / Save PDF",
}: {
  onPrint?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onPrint?.();
        window.print();
      }}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}