/**
 * Phase 16E.1 — Legacy recommendedDegrees education-taxonomy cleanup.
 *
 * Rewrites ONLY the three forbidden malformed patterns in legacy caree 's
 * recommendedDegrees arrays (matching is unaffected — trait rows are separate):
 *   1. "B.Tech/B.E." combined  -> "B.Tech"   (keeps discipline suffix)
 *   2. "BCA/MCA" as one token  -> "BCA"
 *   3. "Any degree ..." fragment -> removed (keeps informative suffix)
 *
 * Conservative: transforms only the forbidden fragment, preserving the rest of
 * each token. Idempotent. Dry-run by default; pass --apply to persist.
 */
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

function rewriteToken(tok) {
  let t = tok;
  let changed = false;

  const btech = /B\.Tech\.?\/B\.?E\.?\.?/i;
  if (btech.test(t)) { t = t.replace(/B\.Tech\.?\/B\.?E\.?\.?/i, "B.Tech"); changed = true; }

  if (/BCA\/MCA/i.test(t)) { t = t.replace(/BCA\/MCA/i, "BCA"); changed = true; }

  if (/any\s+degree/i.test(t)) {
    let rest = t.replace(/^\s*(or\s+)?any\s+degree\s*\([^)]*\)\s*\+\s*/i, "")
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
    t = t.replace(/\s{2,}/g, " ").trim()
          .replace(/\s+\+/g, " +")
          .replace(/\(\s*\)/g, "")
          .trim();
    t = t.replace(/^[,;]+\s*/, "").replace(/\s*[,;]+$/, "");
    if (!t) return null;
  }

  return changed ? t : tok;
}

const careers = await prisma.career.findMany({
  where: { isActive: true },
  select: { id: true, name: true, recommendedDegrees: true },
});

let affected = 0;
let changedTokens = 0;
let dropped = 0;
let updates = [];
for (const c of careers) {
  const out = [];
  let changed = false;
  for (const d of c.recommendedDegrees || []) {
    const r = rewriteToken(d);
    if (r === null) { dropped++; changed = true; continue; }
    out.push(r);
    if (r !== d) { changedTokens++; changed = true; }
  }
  if (changed) {
    affected++;
    updates.push({ id: c.id, name: c.name, to: out });
  }
}

console.log(`mode=${APPLY ? "APPLY" : "DRY-RUN"}`);
console.log(`affected careers=${affected} changedTokens=${changedTokens} droppedTokens=${dropped}`);

if (APPLY) {
  for (const u of updates) {
    await prisma.career.update({ where: { id: u.id }, data: { recommendedDegrees: u.to } });
  }
  console.log(`updated ${updates.length} careers`);
} else {
  for (const u of updates) {
    console.log(`  [${u.name}] -> ${JSON.stringify(u.to)}`);
  }
}
await prisma.$disconnect();
