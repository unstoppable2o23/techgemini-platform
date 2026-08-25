"use client";

import { useTenant } from "@/providers/tenant-theme-provider";
import { LayoutDashboard } from "lucide-react";

export function BrandLogo({
  className = "h-14 w-14",
  override,
}: {
  className?: string;
  override?: string;
}) {
  const tenant = useTenant();
  const logoUrl = override || tenant.logoUrl;

  if (logoUrl) {
    return (
      <div
        className={`mx-auto mb-3 flex items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 p-2 shadow-lg backdrop-blur-md ${className}`}
      >
        <img
          src={logoUrl}
          alt={tenant.brandName || "Brand"}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg ${className}`}
    >
      <LayoutDashboard className="h-7 w-7" />
    </div>
  );
}
