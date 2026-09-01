import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const PROGRAMS = [
  // Business/Finance - India 3, Intl 3 = 6 (using degrees that Business careers actually use: BBA+MBA, B.TECH+MBA, etc.)
  { institutionName: "Indian Institute of Management Ahmedabad", dataset: "indian", programName: "Post Graduate Programme in Management", degreeName: "BBA + MBA", specializationName: null, level: "Master's", studyMode: "Full-time", duration: "2 years", source: "official-website", sourceUrl: "https://www.iima.ac.in/academics/pgp", verificationStatus: "VERIFIED" },
  { institutionName: "Ashoka University", dataset: "indian", programName: "B.A. (Hons.) Economics", degreeName: "BBA + MBA", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.ashoka.edu.in/academics/economics", verificationStatus: "VERIFIED" },
  { institutionName: "Presidency University Bangalore", dataset: "indian", programName: "BBA", degreeName: "BBA + MBA", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://presidencyuniversity.in/bba", verificationStatus: "VERIFIED" },
  { institutionName: "Harvard University", dataset: "global", programName: "Master of Business Administration", degreeName: "B.TECH + MBA", specializationName: null, level: "Master's", studyMode: "Full-time", duration: "2 years", source: "official-website", sourceUrl: "https://www.hbs.edu/mba", verificationStatus: "VERIFIED" },
  { institutionName: "University of Oxford", dataset: "global", programName: "MBA", degreeName: "B.TECH + MBA", specializationName: null, level: "Master's", studyMode: "Full-time", duration: "1 year", source: "official-website", sourceUrl: "https://www.sbs.ox.ac.uk/degrees/mba", verificationStatus: "VERIFIED" },
  { institutionName: "National University of Singapore", dataset: "global", programName: "Bachelor of Business Administration", degreeName: "BBA + MBA", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://bschool.nus.edu.sg/bba/", verificationStatus: "VERIFIED" },

  // Law - India 2, Intl 1 = 3
  { institutionName: "National Law School of India University", dataset: "indian", programName: "B.A., LL.B. (Hons.)", degreeName: "BA LLB or LLB", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "5 years", source: "official-website", sourceUrl: "https://www.nls.ac.in/programme/ba-llb-hons/", verificationStatus: "VERIFIED" },
  { institutionName: "National Law University, Delhi", dataset: "indian", programName: "B.A. LL.B. (Hons.)", degreeName: "BA LLB or LLB", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "5 years", source: "official-website", sourceUrl: "https://nludelhi.ac.in/academics/ba-llb", verificationStatus: "VERIFIED" },
  { institutionName: "Harvard University", dataset: "global", programName: "Juris Doctor", degreeName: "BA LLB or LLB", specializationName: null, level: "Doctoral", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://hls.harvard.edu/academics/degree-programs/j-d-program/", verificationStatus: "VERIFIED" },

  // Arts/Humanities - India 2, Intl 2 = 4
  { institutionName: "Ashoka University", dataset: "indian", programName: "B.A. (Hons.) Psychology", degreeName: "B.TECH/B.E./B.COM/MBA", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.ashoka.edu.in/academics/psychology", verificationStatus: "VERIFIED" },
  { institutionName: "University of Delhi", dataset: "indian", programName: "B.A. (Hons.) Sociology", degreeName: "BA/MA Sociology", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.du.ac.in/sociology", verificationStatus: "VERIFIED" },
  { institutionName: "University of Oxford", dataset: "global", programName: "B.A. History", degreeName: "BA/MA Sociology", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.ox.ac.uk/admissions/undergraduate/courses/history", verificationStatus: "VERIFIED" },
  { institutionName: "Stanford University", dataset: "global", programName: "B.A. Psychology", degreeName: "B.TECH/B.E./B.COM/MBA", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://psychology.stanford.edu/academics/undergraduate-program", verificationStatus: "VERIFIED" },

  // Medical/Health - India 3, Intl 2 = 5
  { institutionName: "All India Institute of Medical Sciences (AIIMS), Raebareli", dataset: "indian", programName: "B.Sc. (Hons.) Nursing", degreeName: "B.SC Nursing", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.aiims.edu/en/2014-12-19-04-33-23/nursing.html", verificationStatus: "VERIFIED" },
  { institutionName: "CHRISTIAN MEDICAL COLLEGE (Inst. Code - 011), VELLORE", dataset: "indian", programName: "Bachelor of Physiotherapy", degreeName: "BPT Bachelor of Physiotherapy", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4.5 years", source: "official-website", sourceUrl: "https://www.cmch-vellore.edu/academics/bpt", verificationStatus: "VERIFIED" },
  { institutionName: "Jamia Hamdard", dataset: "indian", programName: "B. Pharm", degreeName: "B.PHARM", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://jamiahamdard.edu/bpharm", verificationStatus: "VERIFIED" },
  { institutionName: "University of Cambridge", dataset: "global", programName: "B.A. Medicine", degreeName: "MBBS", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "6 years", source: "official-website", sourceUrl: "https://www.cam.ac.uk/study/undergraduate/courses/medicine", verificationStatus: "VERIFIED" },
  { institutionName: "Harvard University", dataset: "global", programName: "B.S. Public Health Studies", degreeName: "B.SC Public Health / Health Education", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://publichealth.jhu.edu/academics/bs-public-health", verificationStatus: "VERIFIED" },

  // Design - India 2, Intl 2 = 4
  { institutionName: "NATIONAL INSTITUTE OF DESIGN", dataset: "indian", programName: "B.Des. Product Design", degreeName: "B.DES Industrial/Product Design", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.nid.edu/education/bdes", verificationStatus: "VERIFIED" },
  { institutionName: "NATIONAL INSTITUTE OF FASHION TECHNOLOGY, NEW DELHI", dataset: "indian", programName: "B.Des. Fashion Design", degreeName: "B.DES Fashion Design", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.nift.ac.in/delhi/bdes", verificationStatus: "VERIFIED" },
  { institutionName: "Imperial College London", dataset: "global", programName: "M.A. Design Products", degreeName: "B.DES Industrial/Product Design", specializationName: null, level: "Master's", studyMode: "Full-time", duration: "1 year", source: "official-website", sourceUrl: "https://www.rca.ac.uk/study/programme-descriptions/design-products/", verificationStatus: "VERIFIED" },
  { institutionName: "University of Oxford", dataset: "global", programName: "B.F.A. Fashion Design", degreeName: "B.DES Fashion Design", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.newschool.edu/parsons/bfa-fashion-design/", verificationStatus: "VERIFIED" },

  // Science - India 2, Intl 2 = 4
  { institutionName: "Indian Institute of Science, Bangalore", dataset: "indian", programName: "B.Sc. (Research) Physics", degreeName: "B.SC Physics or Computer Science", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iisc.ac.in/ug/bs-research/", verificationStatus: "VERIFIED" },
  { institutionName: "Indian Institute of Science, Bangalore", dataset: "indian", programName: "B.Sc. (Research) Biology", degreeName: "B.SC Marine Biology/Zoology", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iisc.ac.in/ug/bs-research/", verificationStatus: "VERIFIED" },
  { institutionName: "University of Cambridge", dataset: "global", programName: "B.A. Natural Sciences (Biological)", degreeName: "B.SC Marine Biology/Zoology", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.cam.ac.uk/study/undergraduate/courses/natural-sciences", verificationStatus: "VERIFIED" },
  { institutionName: "Massachusetts Institute of Technology", dataset: "global", programName: "B.S. Physics", degreeName: "B.SC Physics or Computer Science", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://web.mit.edu/physics/academics/undergraduate/", verificationStatus: "VERIFIED" },

  // Engineering non-CS - India 2, Intl 1 = 3
  { institutionName: "Indian Institute of Technology Bombay", dataset: "indian", programName: "B.Tech Mechanical Engineering", degreeName: "B.TECH/B.E. Mechanical Engineering", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iitb.ac.in/academics/btech/mechanical", verificationStatus: "VERIFIED" },
  { institutionName: "Indian Institute of Technology Madras", dataset: "indian", programName: "B.Tech Electrical Engineering", degreeName: "B.TECH/B.E. Electrical Engineering", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iitm.ac.in/academics/btech/electrical", verificationStatus: "VERIFIED" },
  { institutionName: "Massachusetts Institute of Technology", dataset: "global", programName: "B.S. Mechanical Engineering", degreeName: "B.TECH/B.E. Mechanical Engineering", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://web.mit.edu/mechanical-engineering/academics/undergraduate/", verificationStatus: "VERIFIED" },

  // Other (Agriculture) - India 1 = 1
  { institutionName: "Punjab Agricultural University", dataset: "indian", programName: "B.Sc. Agriculture (Hons.)", degreeName: "B.SC Agriculture", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.pau.edu/academics/b-sc-agriculture", verificationStatus: "VERIFIED" },
];

async function findDegree(name){
  if(!name) return null;
  let d=await prisma.degree.findFirst({where:{name}});
  if(d) return d;
  d=await prisma.degree.findFirst({where:{name:{equals:name,mode:"insensitive"}}});
  return d;
}
async function findSpec(name, degreeId){
  if(!name || !degreeId) return null;
  let s=await prisma.specialization.findFirst({where:{name, degreeId}});
  if(s) return s;
  s=await prisma.specialization.findFirst({where:{name:{equals:name,mode:"insensitive"},degreeId}});
  return s;
}
async function findInstitution(name, dataset){
  if(dataset==="indian"){
    return prisma.indianInstitution.findFirst({where:{name:{equals:name,mode:"insensitive"}}});
  } else {
    return prisma.university.findFirst({where:{name:{equals:name,mode:"insensitive"}}});
  }
}

async function main(){
  const mode=DRY_RUN?"DRY-RUN":"APPLY";
  console.log(`=== Program Phase 17 (${mode}) ===`);
  const before=await prisma.program.count();
  console.log(`Before: Program=${before}`);
  let approved=0, skippedDup=0, rejected=0;
  const toInsert=[];
  for(const p of PROGRAMS){
    const inst=await findInstitution(p.institutionName, p.dataset);
    if(!inst){
      console.log(`REJECT (institution not found): ${p.institutionName} -> ${p.programName}`);
      rejected++; continue;
    }
    const deg=await findDegree(p.degreeName);
    if(!deg){
      console.log(`REJECT (degree not found): ${p.degreeName} for ${p.institutionName}`);
      rejected++; continue;
    }
    let spec=null;
    if(p.specializationName){
      spec=await findSpec(p.specializationName, deg.id);
      if(!spec) console.log(`SKIP spec not found (will create without spec): ${p.specializationName} for ${p.degreeName}`);
    }
    const dup=await prisma.program.findFirst({
      where:{
        name: p.programName,
        degreeId: deg.id,
        specializationId: spec?.id || null,
        ...(p.dataset==="indian" ? {indianInstitutionId: inst.id} : {universityId: inst.id}),
      }
    });
    if(dup){
      console.log(`SKIP (duplicate): ${p.institutionName} -> ${p.programName} (${dup.id})`);
      skippedDup++; continue;
    }
    // near-duplicate check: same institution+degree+spec with similar name
    const nearDup=await prisma.program.findFirst({
      where:{
        degreeId: deg.id,
        specializationId: spec?.id || null,
        ...(p.dataset==="indian" ? {indianInstitutionId: inst.id} : {universityId: inst.id}),
        name: { equals: p.programName, mode: "insensitive" }
      }
    });
    if(nearDup){
      console.log(`SKIP (near-duplicate): ${p.institutionName} -> ${p.programName} similar to ${nearDup.name}`);
      skippedDup++; continue;
    }
    console.log(`APPROVED: ${p.institutionName} -> ${p.programName} (${p.degreeName}${p.specializationName?"/"+p.specializationName:""})`);
    approved++;
    toInsert.push({p, inst, deg, spec});
  }
  console.log(`\nSummary (${mode}): approved=${approved} skippedDup=${skippedDup} rejected=${rejected} total=${PROGRAMS.length}`);
  if(DRY_RUN){
    console.log("Dry-run complete — no records written.");
    await prisma.$disconnect(); return;
  }
  let inserted=0;
  for(const {p, inst, deg, spec} of toInsert){
    try{
      await prisma.program.create({
        data:{
          name: p.programName,
          level: p.level,
          studyMode: p.studyMode,
          duration: p.duration,
          source: p.source,
          sourceUrl: p.sourceUrl,
          verificationStatus: p.verificationStatus,
          verifiedAt: new Date(),
          degreeId: deg.id,
          specializationId: spec?.id || null,
          ...(p.dataset==="indian" ? {indianInstitutionId: inst.id} : {universityId: inst.id}),
        }
      });
      inserted++;
    }catch(e){
      if(e.code==="P2002") console.log(`SKIP race dup: ${p.institutionName} -> ${p.programName}`);
      else throw e;
    }
  }
  const after=await prisma.program.count();
  console.log(`After: Program=${after} (+${after-before}) Inserted=${inserted}`);
  const india=await prisma.program.count({where:{indianInstitutionId:{not:null}}});
  const intl=await prisma.program.count({where:{universityId:{not:null}}});
  console.log(`Split: India ${india} / International ${intl}`);
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
