import { PrismaClient } from "@prisma/client";

export const SUBJECT_SEED = [
  { name: "Mathematics", category: "Science" },
  { name: "Physics", category: "Science" },
  { name: "Chemistry", category: "Science" },
  { name: "Biology", category: "Science" },
  { name: "Statistics", category: "Science" },
  { name: "Computer Science", category: "Technology" },
  { name: "Economics", category: "Commerce" },
  { name: "Accountancy", category: "Commerce" },
  { name: "Business Studies", category: "Commerce" },
  { name: "English", category: "Language" },
  { name: "Languages", category: "Language" },
  { name: "History", category: "Social Science" },
  { name: "Geography", category: "Social Science" },
  { name: "Psychology", category: "Social Science" },
  { name: "Political Science", category: "Social Science" },
  { name: "Sociology", category: "Social Science" },
  { name: "Art & Design", category: "Arts" },
];

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function seedSubjects(prisma) {
  let created = 0;
  let updated = 0;
  for (const subject of SUBJECT_SEED) {
    const slug = slugify(subject.name);
    const existing = await prisma.subject.findUnique({ where: { name: subject.name } });
    if (existing) {
      await prisma.subject.update({
        where: { name: subject.name },
        data: { category: subject.category, isActive: true, slug: existing.slug || slug },
      });
      updated++;
    } else {
      await prisma.subject.create({
        data: { name: subject.name, slug, category: subject.category, isActive: true },
      });
      created++;
    }
  }
  return { created, updated, total: SUBJECT_SEED.length };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const prisma = new PrismaClient();
  seedSubjects(prisma)
    .then((res) => {
      console.log(
        `Subjects seeded: ${res.created} created, ${res.updated} updated (${res.total} canonical subjects).`
      );
    })
    .catch((e) => {
      console.error("Subject seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
