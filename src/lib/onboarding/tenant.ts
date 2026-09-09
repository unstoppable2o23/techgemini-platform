import { prisma } from "@/lib/prisma";

export const PLATFORM_TENANT_SUBDOMAINS = ["app", "default"] as const;

/**
 * Resolves the tenant a new registration should join (brief §7):
 * - an organization subdomain resolves to that organization's tenant;
 * - no subdomain (platform root host / raw IP → the "default" sentinel)
 *   resolves to the platform's default tenant so standalone students who do
 *   not belong to an organization can still register;
 * - on local developer hosts an unmatched subdomain falls back to any tenant
 *   so local/demo signups keep working;
 * - any other unknown subdomain on a deployed host returns null so callers
 *   reject rather than silently enroll into an arbitrary organization.
 */
export async function resolveRegistrationTenant(
  tenantSub: string,
  isLocalDevHost: boolean,
) {
  const bySub = await prisma.tenant.findUnique({
    where: { subdomain: tenantSub },
  });
  if (bySub) return bySub;

  if (tenantSub === "default") {
    const platform = await prisma.tenant.findFirst({
      where: { subdomain: { in: [...PLATFORM_TENANT_SUBDOMAINS] } },
      orderBy: { createdAt: "asc" },
    });
    if (platform) return platform;
  }

  if (isLocalDevHost) {
    return prisma.tenant.findFirst();
  }

  return null;
}