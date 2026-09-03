import { prisma } from "./prisma";

/**
 * Centralized tenant-scoped authorization helpers (Phase 19).
 *
 * All org/counselor/student routes should go through these instead of inline
 * role string comparisons, so tenant isolation is enforced consistently.
 */

export interface SessionLike {
  user?: {
    id?: string;
    role?: string;
    tenantId?: string;
  } | null;
}

/**
 * Role gate. Returns { ok:true, session } when authenticated AND the session
 * role is in the allowed set; otherwise the HTTP status the caller should use.
 */
export async function requireRole(
  session: SessionLike | null,
  allowedRoles: string[]
): Promise<{ ok: true; user: NonNullable<SessionLike["user"]> } | { ok: false; status: number }> {
  const user = session?.user;
  if (!user?.id) return { ok: false, status: 401 };
  if (!allowedRoles.includes(user.role!)) return { ok: false, status: 403 };
  return { ok: true, user: user as NonNullable<SessionLike["user"]> };
}

export type TenantGate =
  | { ok: true; tenantId: string; status: string; planType: string; trialEnded: boolean }
  | { ok: false; status: number; error: string };

/**
 * Confirms a caller's tenant is usable for WRITE operations.
 *
 * - Unauthenticated => 401.
 * - The tenant still exists => 404 if missing.
 * - SUSPENDED tenants cannot create new usage (data is preserved, reads may
 *   still be permitted via separate admin flows).
 * - TRIAL tenants whose trial has ended may not create NEW usage beyond the
 *   trial plan entitlement; this function only gates the suspended case and
 *   returns metadata so callers can apply entitlement limits.
 *
 * Returns ok:false only for genuine write blockers (suspension). Entitlement
 * limits (max students/counselors) are returned via `entitlementForTenant`.
 */
export async function tenantWriteGate(session: SessionLike | null): Promise<TenantGate> {
  const user = session?.user;
  if (!user?.id) return { ok: false, status: 401, error: "Unauthorized" };
  const tenantId = user.tenantId;
  if (!tenantId) return { ok: false, status: 403, error: "No tenant bound to user" };

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, planType: true, trialEndsAt: true },
  });
  if (!tenant) return { ok: false, status: 404, error: "Organization not found" };

  if (tenant.status === "SUSPENDED") {
    return { ok: false, status: 403, error: "Organization is suspended. Contact support." };
  }

  const trialEnded =
    !!tenant.trialEndsAt && tenant.trialEndsAt.getTime() < Date.now();

  return {
    ok: true,
    tenantId: tenant.id,
    status: tenant.status,
    planType: tenant.planType,
    trialEnded,
  };
}

/**
 * Resolves the entitlement (plan limits) for a tenant's subscription.
 * Never throws: falls back to a permissive default if nothing is provisioned
 * so existing data/isolation keeps working even before subscription setup.
 */
export interface Entitlement {
  planType: string;
  maxCounselors: number;
  maxStudents: number;
  hasReports: boolean;
  hasUniversityRecommendations: boolean;
  hasCounselorFeatures: boolean;
  subscriptionStatus?: string;
}

export async function entitlementForTenant(tenantId: string): Promise<Entitlement> {
  const sub = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });
  if (sub?.plan) {
    return {
      planType: sub.plan.planType,
      maxCounselors: sub.plan.maxCounselors,
      maxStudents: sub.plan.maxStudents,
      hasReports: sub.plan.hasReports,
      hasUniversityRecommendations: sub.plan.hasUniversityRecommendations,
      hasCounselorFeatures: sub.plan.hasCounselorFeatures,
      subscriptionStatus: sub.status,
    };
  }
  // Permissive fallback for grandfathered / unprovisioned tenants.
  return {
    planType: "PROFESSIONAL",
    maxCounselors: 1000,
    maxStudents: 100000,
    hasReports: true,
    hasUniversityRecommendations: true,
    hasCounselorFeatures: true,
  };
}

/**
 * Convenience: is the tenant suspended?
 */
export async function isTenantSuspended(tenantId: string): Promise<boolean> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });
  return t?.status === "SUSPENDED";
}

/**
 * Whether a tenant may CREATE an additional student under its plan.
 * Trial-expired tenants are limited to the trial plan's student capacity.
 */
export async function canAddStudent(tenantId: string): Promise<{ ok: boolean; max: number; existing: number }> {
  const ent = await entitlementForTenant(tenantId);
  const gate = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true, trialEndsAt: true, planType: true },
  });
  const existing = await prisma.user.count({ where: { tenantId, role: "STUDENT" } });
  const max = ent.maxStudents;
  return { ok: existing < max && gate?.status !== "SUSPENDED", max, existing };
}

/**
 * Whether a tenant may CREATE an additional counselor under its plan.
 */
export async function canAddCounselor(tenantId: string): Promise<{ ok: boolean; max: number; existing: number }> {
  const ent = await entitlementForTenant(tenantId);
  const gate = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });
  const existing = await prisma.user.count({ where: { tenantId, role: "COUNSELOR" } });
  const max = ent.maxCounselors;
  return { ok: existing < max && gate?.status !== "SUSPENDED", max, existing };
}

/**
 * Should this write be blocked because the trial has expired and the action
 * would increase usage beyond the trial plan? Returns the reason or null.
 */
export async function trialExpiryWriteReason(tenantId: string): Promise<string | null> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true, trialEndsAt: true, planType: true },
  });
  if (!t) return "Organization not found";
  if (t.status === "SUSPENDED") return "Organization is suspended. Contact support.";
  const trialEnded = !!t.trialEndsAt && t.trialEndsAt.getTime() < Date.now();
  if (t.status === "TRIAL" && trialEnded) {
    return "Your trial has ended. Upgrade to continue adding capacity.";
  }
  return null;
}