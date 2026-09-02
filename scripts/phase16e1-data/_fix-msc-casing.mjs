import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const qa = await prisma.career.findFirst({ where: { name: "Quantitative Analyst" } });
  const dup = await prisma.careerTrait.findFirst({
    where: { careerId: qa.id, dimension: "EDUCATION", value: { equals: "M.SC Data Science", mode: "insensitive" } },
  });
  const canon = await prisma.careerTrait.findFirst({
    where: { careerId: qa.id, dimension: "EDUCATION", value: "M.Sc Data Science" },
  });
  console.log("dup:", dup ? dup.id + "=" + dup.value : "none", "canon:", canon ? canon.id + "=" + canon.value : "none");
  if (dup && !canon) {
    await prisma.careerTrait.create({ data: { careerId: qa.id, dimension: "EDUCATION", value: "M.Sc Data Science", weight: 1 } });
    await prisma.careerTrait.delete({ where: { id: dup.id } });
    console.log("fixed: recreated M.Sc Data Science, deleted M.SC Data Science");
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });