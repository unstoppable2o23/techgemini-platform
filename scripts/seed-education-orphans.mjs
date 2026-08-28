import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Normalize a recommended-degree string to a base degree name we can match.
function baseDegreeName(raw) {
  let s = String(raw || "").trim();
  // Take the part before common qualifiers.
  s = s.split(/\s*\+|,|\(| or |\//i)[0].trim();
  return s;
}

function matchExistingDegree(name, degrees) {
  const base = baseDegreeName(name).toLowerCase();
  if (!base) return null;
  return (
    degrees.find((d) => d.name.toLowerCase() === base) ||
    degrees.find((d) => d.name.toLowerCase().startsWith(base + " ")) ||
    degrees.find((d) => base.startsWith(d.name.toLowerCase() + " ")) ||
    null
  );
}

export async function seedEducationOrphans() {
  const careers = await prisma.career.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      recommendedDegrees: true,
      recommendedSubjects: true,
    },
  });
  const degrees = await prisma.degree.findMany({ select: { id: true, name: true } });
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true, slug: true } });

  let added = 0;
  let skipped = 0;

  for (const c of careers) {
    const have = await prisma.careerEducationPathway.count({ where: { careerId: c.id } });
    if (have > 0) continue; // already mapped by the main education seed

    let linked = 0;

    // Recommended subjects -> SUBJECT_LINK (only when an existing Subject exists).
    for (const subjName of c.recommendedSubjects || []) {
      const match = subjects.find(
        (s) => s.name.toLowerCase() === String(subjName).toLowerCase()
      );
      if (!match) continue;
      const exists = await prisma.careerEducationPathway.findFirst({
        where: { careerId: c.id, subjectId: match.id, type: "SUBJECT_LINK" },
      });
      if (exists) continue;
      await prisma.careerEducationPathway.create({
        data: { careerId: c.id, subjectId: match.id, priority: "ALTERNATIVE", type: "SUBJECT_LINK", notes: "Recommended subject" },
      });
      linked++;
    }

    // Recommended degrees -> DEGREE_PATHWAY (only when an authoritative Degree
    // record already exists; we do NOT fabricate new Degree records).
    for (const degName of c.recommendedDegrees || []) {
      const degree = matchExistingDegree(degName, degrees);
      if (!degree) continue;
      const exists = await prisma.careerEducationPathway.findFirst({
        where: { careerId: c.id, degreeId: degree.id, type: "DEGREE_PATHWAY", priority: "PRIMARY" },
      });
      if (exists) continue;
      await prisma.careerEducationPathway.create({
        data: { careerId: c.id, degreeId: degree.id, priority: "PRIMARY", type: "DEGREE_PATHWAY", notes: degName },
      });
      linked++;
    }

    if (linked > 0) {
      added++;
      console.log(`Mapped ${c.name}: ${linked} pathway(s)`);
    } else {
      skipped++;
      console.log(`No mappable data for ${c.name}`);
    }
  }

  console.log(`\nOrphan pathway seed: ${added} careers mapped, ${skipped} without mappable data.`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedEducationOrphans()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
