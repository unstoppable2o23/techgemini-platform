/**
 * Phase 16E.1 — Shared pure helpers for recommendedDegrees hygiene.
 *
 * Single source of truth used by the career-intelligence seed and P4 regression
 * tests. Guarantees the seed is additive/upsert-safe with respect to degree
 * tokens: re-running the seed can never re-introduce the forbidden legacy
 * patterns (combined "B.Tech/B.E.", "BCA/MCA", "any degree ..." fragments, or
 * bare "DATA ..." pseudo-degrees). Idempotent by construction.
 */
function normalizeDegreeToken(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Conservative fragment rewrite (keeps informative suffix). */
export function rewriteDegreeToken(tok) {
  let t = tok;
  let changed = false;

  const btech = /B\.Tech\.?\/B\.?E\.?\.?/i;
  if (btech.test(t)) {
    t = t.replace(/B\.Tech\.?\/B\.?E\.?\.?/i, "B.Tech");
    changed = true;
  }

  if (/BCA\/MCA/i.test(t)) {
    t = t.replace(/BCA\/MCA/i, "BCA");
    changed = true;
  }

  if (/any\s+degree/i.test(t)) {
    let rest = t
      .replace(/^\s*(or\s+)?any\s+degree\s*\([^)]*\)\s*\+\s*/i, "")
      .replace(/^\s*(or\s+)?any\s+degree\s*\([^)]*\)/i, "")
      .replace(/^\s*(or\s+)?any\s+degree\b/i, "")
      .replace(/\s*\/\s*(or\s+)?any\s+degree\b/gi, "")
      .replace(/\b(or\s+)?any\s+degree\b/gi, "")
      .replace(/^\s*[:;,\s+]*/, "")
      .replace(/\s*[:;,\s+]\s*$/, "")
      .trim();
    t = rest;
    changed = true;
    if (/^\(\s*.+\s*\)$/.test(t)) t = t.replace(/^\(\s*/, "").replace(/\s*\)$/, "").trim();
    else if (/^\(/.test(t)) t = t.replace(/^\(\s*/, "").trim();
    if (!t || /^[;,\s+]*$/.test(t) || /^[:;\s+]*$/.test(t) || /^any$/i.test(t)) return null;
  }

  if (changed) {
    t = t
      .replace(/\s{2,}/g, " ")
      .trim()
      .replace(/\s+\+/g, " +")
      .replace(/\(\s*\)/g, "")
      .trim();
    t = t.replace(/^[,;]+\s*/, "").replace(/\s*[,;]+$/, "");
    if (!t) return null;
  }

  return changed ? t : tok;
}

/** Split a combined token at separators and keep the first usable fragment. */
function baseDegreeName(raw) {
  let s = String(raw || "").trim();
  s = s.split(/\s*\+|,|\(| or |\//i)[0].trim();
  return s;
}

/**
 * Clean a whole degree-token list for persistence in recommendedDegrees.
 * Applies rewriteDegreeToken per token, then drops any remaining bare
 * pseudo-degrees, and de-duplicates case-insensitively. Idempotent.
 */
export function cleanDegreeList(deg) {
  const out = [];
  const seen = new Set();
  for (const raw of deg || []) {
    const rewritten = rewriteDegreeToken(raw);
    if (rewritten === null) continue;
    /* extra guard: a token that still reduces to a bare pseudo-degree. */
    const base = baseDegreeName(rewritten);
    const u = base.toUpperCase().trim();
    if (!base || u === "ANY DEGREE" || u === "ANY" || u.startsWith("DATA")) continue;
    const key = normalizeDegreeToken(rewritten);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(rewritten);
  }
  return out;
}