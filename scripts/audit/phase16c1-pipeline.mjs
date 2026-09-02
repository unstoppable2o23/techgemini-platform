// Phase 16C.1 — section 4: assessment-to-career pipeline test (real engine path).
// For representative canonical assessment signals (A-H) confirm the full chain
// against the LIVE engine (getCareerMatches):
//   assessment signal -> normalized student signal -> matching dimension ->
//   career trait -> evidence -> score contribution.
// Each scenario uses a transient student; all rows are torn down. READ ONLY.
import { PrismaClient } from "@prisma/client";
import { getCareerMatches } from "../../src/lib/career-matching/engine.ts";
import { CANONICAL_SIGNALS } from "../../src/lib/career-profile/canonical-signals.ts";

const prisma = new PrismaClient();

const SCENARIOS = [
  { label: "A. logical_reasoning", dimension: "APTITUDE", value: "logical_reasoning", expectedDim: "APTITUDE" },
  { label: "B. pattern_recognition", dimension: "APTITUDE", value: "pattern_recognition", expectedDim: "APTITUDE" },
  { label: "C. visual_spatial", dimension: "APTITUDE", value: "visual_spatial", expectedDim: "APTITUDE" },
  { label: "D. interpersonal", dimension: "APTITUDE", value: "interpersonal", expectedDim: "APTITUDE" },
  { label: "E. attention_to_detail", dimension: "APTITUDE", value: "attention_to_detail", expectedDim: "APTITUDE" },
  { label: "F. independent-work env", dimension: "WORK_ENVIRONMENT", value: "independent_preference", expectedDim: "WORK_ENVIRONMENT" },
  { label: "G. collaborative-work env", dimension: "WORK_ENVIRONMENT", value: "collaborative_preference", expectedDim: "WORK_ENVIRONMENT" },
  { label: "H. research-focused (interest)", dimension: "INTEREST", value: "research", expectedDim: "INTEREST" },
];

async function makeStudent() {
  const suffix = Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const tenant = await prisma.tenant.create({ data: { name: "P47", slug: `p47-${suffix}`, subdomain: `p47-${suffix}` } });
  const user = await prisma.user.create({ data: { email: `p47-${suffix}@x.com`, passwordHash: "x", firstName: "P47", lastName: "C", role: "STUDENT", tenantId: tenant.id } });
  const sp = await prisma.studentProfile.create({ data: { userId: user.id } });
  const cp = await prisma.studentCareerProfile.create({ data: { studentId: user.id } });
  return { tenant, user, sp, cp };
}
async function destroy({ tenant, user, sp, cp }) {
  await prisma.studentCareerSignal.deleteMany({ where: { profileId: cp.id } });
  await prisma.studentCareerProfile.deleteMany({ where: { id: cp.id } });
  await prisma.studentProfile.deleteMany({ where: { id: sp.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.tenant.deleteMany({ where: { id: tenant.id } });
}

async function main() {
  console.log("=== Phase 16C.1 — section 4: assessment-to-career pipeline (live engine) ===");

  for (const s of SCENARIOS) {
    const canon = CANONICAL_SIGNALS[s.value];
    const dimOk = canon && canon.dimension === s.dimension;
    if (!dimOk) { console.log(`\n${s.label}: WARNING canonical signal NOT in ${s.dimension} (declared ${canon ? canon.dimension : "none"})`); continue; }

    const signup = await makeStudent();
    try {
      await prisma.studentCareerSignal.create({
        data: {
          profileId: signup.cp.id,
          dimension: s.dimension,
          value: s.value,
          score: 88,
          sourceType: "ASSESSMENT",
          sourceAssessment: "ideal",
          confidence: 0.8,
          sourceVersion: "1.0",
        },
      });
      // No studentProfile data -> only this assessment signal drives matching.
      const res = await getCareerMatches(signup.user.id, { limit: 8 });
      const matches = res.matches;
      // The target dimension should contribute for careers that have the trait.
      const withContrib = matches.filter((m) => {
        const d = m.dimensionScores.find((x) => x.dimension === s.expectedDim);
        return d && d.matchedCount > 0;
      });
      const topNontrivial = matches.filter((m) => m.matchScore > 0).slice(0, 5);
      console.log(`\n${s.label} dim=${s.dimension} canonicalDimOK=${dimOk}`);
      console.log(`   signals used=${res.studentSignalsUsed} hasAssessment=${res.hasAssessmentData}`);
      console.log(`   careers with ${s.expectedDim} contribution in top8: ${withContrib.length}`);
      console.log(`   top non-zero matches:`);
      topNontrivial.forEach((m, i) => {
        const d = m.dimensionScores.find((x) => x.dimension === s.expectedDim);
        console.log(`      ${i + 1}. ${m.career.name} score=${m.matchScore} ${s.expectedDim}.matched=${d?.matchedCount ?? 0} (dimScore=${d?.score ?? 0})`);
      });
    } finally {
      await destroy(signup);
    }
  }
}

main().finally(() => prisma.$disconnect());