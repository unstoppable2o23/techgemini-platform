import { normalizeForMatch } from "./config";

/**
 * Canonical preferred-career resolution.
 *
 * A student's preferred career is resolved in order of trust:
 *   1. canonical Career.id (the authoritative record id)
 *   2. exact normalized name match against active careers
 *   3. explicit alias (rare; only unambiguous display-name variants)
 *   4. resolved:false (recorded as unresolved, no forced match)
 *
 * The legacy free-text `preferredCareer` string is preserved for display and
 * back-compat; it is never used to invent a career that does not exist.
 */

export type PreferredCareerSource = "id" | "name_exact" | "alias" | "unresolved";

export type PreferredCareerResolution = {
  careerId: string | null;
  careerName: string | null;
  resolved: boolean;
  source: PreferredCareerSource;
  /**
   * Whether conservative text matching against the legacy career name is
   * allowed. False when the student supplied a canonical id (authoritative) or
   * when we simply found no career — we must never guess in those cases. True
   * for legacy free-text preferences where a normalized name match is the best
   * evidence available.
   */
  fallbackAllowed: boolean;
};

export type PreferredCareerReference = {
  careerId: string | null;
  careerName: string | null;
  nameResolved: boolean;
  source: PreferredCareerSource;
};

/**
 * Builds a legacy-style reference from a raw free-text career string. Used to
 * keep the pure scoring function backward-compatible when callers pass a
 * plain string preference instead of a resolved reference.
 */
export function legacyPreferredReference(careerName: string | null): PreferredCareerResolution {
  const name = careerName?.trim() || null;
  return {
    careerId: null,
    careerName: name,
    resolved: false,
    source: "unresolved",
    fallbackAllowed: Boolean(name),
  };
}

/**
 * Explicit aliases for preferred-career display names that do NOT match the
 * canonical career name. Kept conservatively: only unambiguous, verifiable
 * equivalents belong here. Do not add speculative mappings — an alias pointing
 * at a nonexistent career simply stays unresolved.
 */
export const PREFERRED_CAREER_ALIASES: Record<string, string> = {};

type CareerRef = { id: string; name: string };

export function resolvePreferredCareer(
  careerId: string | null,
  preferredCareer: string | null,
  careers: CareerRef[]
): PreferredCareerResolution {
  const byId = new Map(careers.map((c) => [c.id, c]));

  if (careerId) {
    const career = byId.get(careerId);
    if (career) {
      return {
        careerId: career.id,
        careerName: career.name,
        resolved: true,
        source: "id",
        fallbackAllowed: false,
      };
    }
    // Provided id does not correspond to an active career: record unresolved.
    // An id was authoritative input — never fall back to guessing by text.
    return {
      careerId: null,
      careerName: preferredCareer ? preferredCareer.trim() : null,
      resolved: false,
      source: "unresolved",
      fallbackAllowed: false,
    };
  }

  if (!preferredCareer) {
    return { careerId: null, careerName: null, resolved: false, source: "unresolved", fallbackAllowed: false };
  }

  const normalized = normalizeForMatch(preferredCareer);
  if (!normalized) {
    return { careerId: null, careerName: null, resolved: false, source: "unresolved", fallbackAllowed: false };
  }

  const exact = careers.find((c) => normalizeForMatch(c.name) === normalized);
  if (exact) {
    return { careerId: exact.id, careerName: exact.name, resolved: true, source: "name_exact", fallbackAllowed: false };
  }

  const aliasTarget = PREFERRED_CAREER_ALIASES[preferredCareer.trim().toLowerCase()];
  if (aliasTarget) {
    const aliasCareer = careers.find((c) => normalizeForMatch(c.name) === normalizeForMatch(aliasTarget));
    if (aliasCareer) {
      return { careerId: aliasCareer.id, careerName: aliasCareer.name, resolved: true, source: "alias", fallbackAllowed: false };
    }
  }

  return {
    careerId: null,
    careerName: preferredCareer.trim(),
    resolved: false,
    source: "unresolved",
    fallbackAllowed: true,
  };
}