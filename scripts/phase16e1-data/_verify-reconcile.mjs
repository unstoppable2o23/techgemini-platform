import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const newNames = new Set(["Agronomy","Aquaculture","Archaeology","Architectural Technology","Archival Studies","Broadcast Journalism","Carbon Accounting Specialist","Circular Economy Specialist","Climate Policy Analyst","Conservation Scientist","Copywriting","Corporate Law","Counselling Psychology","Cultural Studies","Development Studies","Documentary Production","Educational Psychology","Environmental Consultant","Environmental Impact Assessment Specialist","Environmental Law","Human Rights Law","Instructional Design","International Law","International Relations","Legal Research","Linguistics","Media Planning","Museum Studies and Curatorship","Organizational Psychology","Philosophy","Photojournalism","Publishing","Screenwriting","Social Research","Sustainable Architecture","Tax Law","Technical Writing","Urban Design"]);
  const cs = await prisma.career.findMany({ where: { isActive: true }, select: { name: true, technicalSkills: true, interests: true, personalityTraits: true, recommendedDegrees: true, recommendedSubjects: true, shortDescription: true } });
  const nc = cs.filter(c => newNames.has(c.name));
  const empties = { tech: 0, int: 0, per: 0, deg: 0, subj: 0, sd: 0 };
  for (const c of nc) {
    if (!c.technicalSkills?.length) empties.tech++;
    if (!c.interests?.length) empties.int++;
    if (!c.personalityTraits?.length) empties.per++;
    if (!c.recommendedDegrees?.length) empties.deg++;
    if (!c.recommendedSubjects?.length) empties.subj++;
    if (!c.shortDescription?.trim()) empties.sd++;
  }
  console.log("NEW careers (38) - still-empty counts:", empties);
  const qa = await prisma.career.findFirst({ where: { name: "Quantitative Analyst" }, select: { id: true } });
  const edu = await prisma.careerTrait.findMany({ where: { careerId: qa.id, dimension: "EDUCATION" }, select: { value: true } });
  console.log("Quantitative Analyst EDU trait values:", edu.map(x => x.value));
  const sdCount = cs.filter(c => !c.shortDescription?.trim()).length;
  console.log("Total careers still missing shortDescription:", sdCount);
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });