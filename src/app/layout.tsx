import type { Metadata } from "next";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/providers/session-provider";
import { TenantThemeProvider } from "@/providers/tenant-theme-provider";
import { TopNav } from "@/components/layout/top-nav";
import { AccessDeniedModal } from "@/components/access-denied-modal";
import { SessionTimeout } from "@/components/session-timeout";
import { Toaster } from "@/components/ui/toaster";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Study Abroad Platform",
  description: "White-labeled educational counseling platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const subdomain = headersList.get("x-tenant-id") || "";
  const session = await getServerSession(authOptions);

  let brandName = "";
  let logoUrl = "";
  let primaryColor = "#2563EB";
  let accentColor = "#2563EB";

  // Authoritative tenant comes from the authenticated session. For the login
  // page (no session) we fall back to the request subdomain and finally to the
  // first tenant so the platform branding still resolves on any hostname.
  const tenantId =
    session?.user?.tenantId ||
    (await resolveTenantId(subdomain)) ||
    (await firstTenantId());

  const tenant = tenantId
    ? await prisma.tenant.findFirst({
        where: {
          OR: [
            { id: tenantId },
            { subdomain: tenantId },
            { slug: tenantId },
          ],
        },
      })
    : null;

  if (tenant) {
    brandName = tenant.brandName || "";
    logoUrl = tenant.logoUrl || "";
    primaryColor = tenant.primaryColor || primaryColor;
    accentColor = tenant.accentColor || accentColor;
  }

  // Counselors may brand themselves individually; show their own logo in the
  // header when present, falling back to the tenant logo.
  if (session?.user?.id && (session.user.role === "COUNSELOR" || session.user.role === "SUPER_ADMIN")) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { logoUrl: true },
    });
    if (user?.logoUrl) {
      logoUrl = user.logoUrl;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="x-tenant-id" content={tenantId} />
        <meta name="x-tenant-brand" content={brandName} />
        <meta name="x-tenant-logo-url" content={logoUrl} />
        <meta name="x-tenant-primary-color" content={primaryColor} />
        <meta name="x-tenant-accent-color" content={accentColor} />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <SessionProvider>
          <TenantThemeProvider>
            <TopNav />
            <main className="pb-20 md:pb-0">{children}</main>
            <SessionTimeout />
            <AccessDeniedModal />
            <Toaster />
          </TenantThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

async function resolveTenantId(subdomain: string): Promise<string> {
  const trimmed = subdomain?.trim();
  if (!trimmed || trimmed === "default") return "";
  const match = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain: trimmed }, { slug: trimmed }] },
    select: { id: true },
  });
  return match?.id || "";
}

async function firstTenantId(): Promise<string> {
  const t = await prisma.tenant.findFirst({ select: { id: true } });
  return t?.id || "";
}
