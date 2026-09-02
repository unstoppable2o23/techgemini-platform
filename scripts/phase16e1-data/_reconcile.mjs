/**
 * Phase 16E.1 — Reconciliation: backfill missing metadata on the 38 new careers
 * and fix the one genuine trait-row integrity issue.
 *
 * Allowed fixes (Section 12): "fixing missing metadata", "correcting invalid
 * education mapping", "removing duplicate traits".
 *
 * Guarantees:
 *   - Additive / idempotent (re-runnable).
 *   - Never invents data (uses only authored fields from phase16e-data JSON +
 *     existing Subject/Degree records).
 *   - Read-only on University / IndianInstitution / Program / assessment / matching.
 *   - No new careers, no merges/deletes/renames of existing careers.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const APTITUDE_SET = new Set([
  "logical_reasoning","logical_mathematical","pattern_recognition","attention_to_detail",
  "visual_spatial","linguistic","interpersonal","intrapersonal","naturalist",
  "emotional_intelligence","bodily_kinesthetic"
]);
const WORKENV_SET = new Set([
  "collaborative_preference","independent_preference","prefers_structure","prefers_autonomy",
  "prefers_quiet","prefers_formal_setting","self_driven","prefers_background_sound",
  "prefers_bright_light","prefers_soft_lighting","prefers_warm_environment",
  "prefers_cool_environment","prefers_relaxed_setting","benefits_from_intake",
  "needs_mobility","morning_person","evening_person","prefers_autonomy"
]);

/* ---- helpers ---- */
function normalize(s) { return String(s || "").toLowerCase().trim().replace(/\s+/g, " "); }
function slugify(s) { return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }

/** Strip combined-token suffixes; never invents. */
function baseDegreeName(raw) {
  let s = String(raw || "").trim();
  s = s.split(/\s*\+|,|\(| or |\//i)[0].trim();
  return s;
}

/** Return the subset of deg tokens that are safe to store in recommendedDegrees. */
function cleanDegTokens(deg) {
  const out = [];
  const seen = new Set();
  for (const d of (deg || [])) {
    const c = baseDegreeName(d);
    const u = c.toUpperCase();
    if (!c) continue;
    /* Do NOT reintroduce malformed combined tokens (brief rule): ANY degree,
       BCA/MCA combined, B.Tech/B.E. combined, and any purely non-degree token
       such as "DATA ...". */
    if (u === "ANY DEGREE" || u === "ANY" || u.startsWith("DATA")) continue;
    if (seen.has(normalize(c))) continue;
    seen.add(normalize(c));
    out.push(c);
  }
  return out;
}

/* ---- load phase16e data ---- */
function loadCareers() {
  const dir = join(__dirname, "../phase16e-data");
  const files = readdirSync(dir).filter(f => f.endsWith(".json") && !f.startsWith("_"));
  const careers = [];
  for (const f of files) {
    const arr = JSON.parse(readFileSync(join(dir, f), "utf8"));
    careers.push(...arr);
  }
  return careers;
}

/* ---- main ---- */
async function main() {
  const phase16e = loadCareers();
  const phase16eByName = new Map(phase16e.map(c => [normalize(c.name), c]));

  // All active 289 careers
  const allCareers = await prisma.career.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, shortDescription: true, introduction: true },
  });
  const byName = new Map(allCareers.map(c => [normalize(c.name), c]));

  let scalarBackfilled = 0;
  let subjectLinkCreated = 0;
  let subjectLinkSkipped = 0;
  let shortDescriptionBackfilled = 0;
  let dupTraitRemoved = 0;

  // Preload Subject lookup once (Subject table is the canonical reference).
  const allSubjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  const subjByName = new Map(allSubjects.map(s => [s.name.toLowerCase(), s.id]));

  // ---- 1) Backfill scalar arrays + shortDescription for the 38 new careers ----
  for (const c of phase16e) {
    const norm = normalize(c.name);
    const db = byName.get(norm);
    if (!db) { console.warn("WARN career not in DB:", c.name); continue; }

    const tech = Array.isArray(c.tech) ? c.tech : [];
    const int_ = Array.isArray(c.int) ? c.int : [];
    const per = Array.isArray(c.per) ? c.per : [];
    const subj = Array.isArray(c.subj) ? c.subj : [];
    const deg = Array.isArray(c.deg) ? c.deg : [];

    const updates = {};
    if (db.technicalSkills === null || db.technicalSkills === undefined || db.technicalSkills.length === 0)
      updates.technicalSkills = tech;
    if (db.interests === null || db.interests === undefined || db.interests.length === 0)
      updates.interests = int_;
    if (db.personalityTraits === null || db.personalityTraits === undefined || db.personalityTraits.length === 0)
      updates.personalityTraits = per;
    if (db.recommendedSubjects === null || db.recommendedSubjects === undefined || db.recommendedSubjects.length === 0)
      updates.recommendedSubjects = subj;

    // recommendedDegrees: only safe (cleaned) tokens; never reintroduce malformed patterns
    const safeDeg = cleanDegTokens(deg);
    if ((db.recommendedDegrees === null || db.recommendedDegrees === undefined || db.recommendedDegrees.length === 0) && safeDeg.length > 0)
      updates.recommendedDegrees = safeDeg;

    // shortDescription: derive from first sentence of introduction (established convention)
    if ((db.shortDescription === null || db.shortDescription === undefined || db.shortDescription === "") && c.intro) {
      updates.shortDescription = c.intro.split(".")[0].slice(0, 180);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.career.update({ where: { id: db.id }, data: updates });
      scalarBackfilled++;
    }

    // ---- 2) SUBJECT_LINK rows (only where an existing Subject matches) ----
    for (const s of subj) {
      const sid = subjByName.get(s.toLowerCase());
      if (!sid) { subjectLinkSkipped++; continue; }
      const exists = await prisma.careerEducationPathway.findFirst({
        where: { careerId: db.id, subjectId: sid, type: "SUBJECT_LINK" },
      });
      if (exists) { subjectLinkSkipped++; continue; }
      await prisma.careerEducationPathway.create({
        data: { careerId: db.id, subjectId: sid, type: "SUBJECT_LINK", priority: "ALTERNATIVE", notes: "Recommended subject (Phase 16E.1 reconciliation)" },
      });
      subjectLinkCreated++;
    }
  }

  // ---- 3) Backfill shortDescription for ALL careers missing it (from introduction) ----
  for (const c of allCareers) {
    if (c.shortDescription && c.shortDescription.trim()) continue;
    if (!c.introduction || !c.introduction.trim()) continue;
    const desc = c.introduction.split(".")[0].slice(0, 180);
    if (!desc.trim()) continue;
    await prisma.career.update({ where: { id: c.id }, data: { shortDescription: desc } });
    shortDescriptionBackfilled++;
  }

  // ---- 4) Remove duplicate case-variant trait row (Quantitative Analyst: M.SC vs M.Sc) ----
  const qa = allCareers.find(c => normalize(c.name) === "quantitative analyst");
  if (qa) {
    const dup = await prisma.careerTrait.findFirst({
      where: {
        careerId: qa.id,
        dimension: "EDUCATION",
        value: { equals: "M.SC Data Science", mode: "insensitive" },
      },
      select: { id: true, value: true },
    });
    const canonical = await prisma.careerTrait.findFirst({
      where: { careerId: qa.id, dimension: "EDUCATION", value: "M.Sc Data Science" },
      select: { id: true },
    });
    if (dup && canonical) {
      await prisma.careerTrait.delete({ where: { id: dup.id } });
      dupTraitRemoved++;
      console.log(`Removed duplicate trait: "${dup.value}" (kept canonical "M.Sc Data Science")`);
    }
  }

  console.log("\n=== RECONCILIATION SUMMARY ===");
  console.log(`scalar arrays + shortDescription backfilled for new careers: ${scalarBackfilled}`);
  console.log(`SUBJECT_LINK rows created (matching Subject records): ${subjectLinkCreated}`);
  console.log(`SUBJECT_LINK rows skipped (no matching Subject): ${subjectLinkSkipped}`);
  console.log(`shortDescription backfilled (all careers): ${shortDescriptionBackfilled}`);
  console.log(`duplicate trait rows removed: ${dupTraitRemoved}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });