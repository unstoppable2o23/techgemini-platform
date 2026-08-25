"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface TenantConfig {
  tenantId: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

const defaultConfig: TenantConfig = {
  tenantId: "",
  brandName: "",
  logoUrl: "",
  primaryColor: "#2563EB",
  accentColor: "#2563EB",
};

const TenantContext = createContext<TenantConfig>(defaultConfig);

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig>(defaultConfig);

  useEffect(() => {
    const headers = {
      tenantId: getMeta("x-tenant-id"),
      brandName: getMeta("x-tenant-brand"),
      logoUrl: getMeta("x-tenant-logo-url"),
      primaryColor: getMeta("x-tenant-primary-color"),
      accentColor: getMeta("x-tenant-accent-color"),
    };

    const tenantConfig: TenantConfig = {
      tenantId: headers.tenantId || defaultConfig.tenantId,
      brandName: headers.brandName || defaultConfig.brandName,
      logoUrl: headers.logoUrl || defaultConfig.logoUrl,
      primaryColor: headers.primaryColor || defaultConfig.primaryColor,
      accentColor: headers.accentColor || defaultConfig.accentColor,
    };

    setConfig(tenantConfig);
    applyTheme(tenantConfig);
  }, []);

  return (
    <TenantContext.Provider value={config}>{children}</TenantContext.Provider>
  );
}

function getMeta(key: string): string {
  return (
    document.querySelector(`meta[name="${key}"]`)?.getAttribute("content") || ""
  );
}

function hexToHsl(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(config: TenantConfig) {
  const primaryHsl = hexToHsl(config.primaryColor);
  const accentHsl = hexToHsl(config.accentColor);
  document.documentElement.style.setProperty("--primary", primaryHsl);
  document.documentElement.style.setProperty("--accent", accentHsl);
}
