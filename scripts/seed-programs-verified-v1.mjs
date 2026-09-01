import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

function slugify(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}

const PROGRAMS = [
  // India - AI/Data/Engineering (7)
  { institutionName: "Indian Institute of Technology Dharwad", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iitdh.ac.in/academics/btech", verificationStatus: "VERIFIED" },
  { institutionName: "Indian Institute of Technology Palakkad", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iitpkd.ac.in/btech", verificationStatus: "VERIFIED" },
  { institutionName: "Indian Institute of Information Technology Bhopal", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iiitbhopal.ac.in/btech", verificationStatus: "VERIFIED" },
  { institutionName: "Scaler School of Technology", dataset: "indian", programName: "B.Sc Computer Science (4-year Residential)", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.scaler.com/school-of-technology", verificationStatus: "VERIFIED" },
  { institutionName: "Newton School of Technology", dataset: "indian", programName: "B.Tech Computer Science and Artificial Intelligence", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.newtonschool.co", verificationStatus: "VERIFIED" },
  { institutionName: "Presidency University Bangalore", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://presidencyuniversity.in/btech-cse", verificationStatus: "VERIFIED" },
  { institutionName: "All India Institute of Medical Sciences Nagpur", dataset: "indian", programName: "MBBS", degreeName: "MBBS", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "5.5 years", source: "official-website", sourceUrl: "https://aiimsnagpur.edu.in/academics/mbbs", verificationStatus: "VERIFIED" },
  // India - Business/Healthcare/Design/Climate (5)
  { institutionName: "Masters Union", dataset: "indian", programName: "PGP in Technology and Business Management", degreeName: "B.TECH/B.E./B.COM/MBA", specializationName: null, level: "Master's", studyMode: "Full-time", duration: "16 months", source: "official-website", sourceUrl: "https://www.mastersunion.org/pgp", verificationStatus: "VERIFIED" },
  { institutionName: "O.P. Jindal Global University", dataset: "indian", programName: "B.A. LL.B. (Hons.)", degreeName: "B.TECH/B.E./B.COM/MBA", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "5 years", source: "official-website", sourceUrl: "https://jgu.edu.in/jgls", verificationStatus: "VERIFIED" },
  { institutionName: "Rashtram School of Public Leadership", dataset: "indian", programName: "PGP in Public Leadership", degreeName: "B.TECH/B.E./B.COM/MBA", specializationName: null, level: "Postgraduate", studyMode: "Full-time", duration: "1 year", source: "official-website", sourceUrl: "https://rashtram.org/pgp", verificationStatus: "VERIFIED" },
  { institutionName: "Indian Institute of Technology Jammu", dataset: "indian", programName: "B.Tech Cyber Security", degreeName: "B.TECH/B.E. Computer Science or Cyber Security", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iitjammu.ac.in/btech", verificationStatus: "VERIFIED" },
  { institutionName: "Indian Institute of Information Technology Kalyani", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iiitkalyani.ac.in/btech", verificationStatus: "VERIFIED" },
  // India - Biotech/Environmental (3)
  { institutionName: "Indian Institute of Technology Tirupati", dataset: "indian", programName: "B.Tech Biotechnology", degreeName: "B.SC/B.TECH Biotechnology", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iittp.ac.in/btech", verificationStatus: "VERIFIED" },
  { institutionName: "UPES", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.upes.ac.in/btech-cse", verificationStatus: "VERIFIED" },
  { institutionName: "Chitkara University, Punjab", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.chitkara.edu.in/btech-cse", verificationStatus: "VERIFIED" },
  { institutionName: "Anant National University", dataset: "indian", programName: "B.Des Interaction Design", degreeName: "B.DES Graphic Design", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://anu.edu.in/programme/bdes", verificationStatus: "VERIFIED" },
  { institutionName: "Indian Institute of Technology Jammu", dataset: "indian", programName: "B.Tech Energy Engineering", degreeName: "B.TECH/B.E. Electrical/Energy Engineering", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iitjammu.ac.in/btech-energy", verificationStatus: "VERIFIED" },

  // International - AI/Data/Engineering (8)
  { institutionName: "Massachusetts Institute of Technology", dataset: "global", programName: "B.S. Computer Science and Engineering", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.eecs.mit.edu/academics/undergraduate-programs/", verificationStatus: "VERIFIED" },
  { institutionName: "Stanford University", dataset: "global", programName: "B.S. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.cs.stanford.edu/academics/undergrad", verificationStatus: "VERIFIED" },
  { institutionName: "Carnegie Mellon University", dataset: "global", programName: "B.S. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.csd.cs.cmu.edu/academics/undergraduate", verificationStatus: "VERIFIED" },
  { institutionName: "University of California, Berkeley", dataset: "global", programName: "B.S. Electrical Engineering and Computer Sciences", degreeName: "B.TECH/B.E. Electrical Engineering", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www2.eecs.berkeley.edu/Students/Undergrad", verificationStatus: "VERIFIED" },
  { institutionName: "ETH Zurich", dataset: "global", programName: "B.Sc. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://ethz.ch/en/studies/bachelor/bachelor-computer-science.html", verificationStatus: "VERIFIED" },
  { institutionName: "University of Oxford", dataset: "global", programName: "B.A. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.ox.ac.uk/admissions/undergraduate/courses/computer-science", verificationStatus: "VERIFIED" },
  { institutionName: "University of Cambridge", dataset: "global", programName: "B.A. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.cam.ac.uk/study/undergraduate/courses/computer-science", verificationStatus: "VERIFIED" },
  { institutionName: "Imperial College London", dataset: "global", programName: "MEng Computing", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Master's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.imperial.ac.uk/computing/study/ug/", verificationStatus: "VERIFIED" },
  // International - Healthcare/Biotech/Business/Climate (7)
  { institutionName: "National University of Singapore", dataset: "global", programName: "B.Comp. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.comp.nus.edu.sg/programmes/ug/cs/", verificationStatus: "VERIFIED" },
  { institutionName: "Nanyang Technological University", dataset: "global", programName: "B.Eng. Computer Science", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.ntu.edu.sg/education/undergraduate-programme/bsc-computer-science", verificationStatus: "VERIFIED" },
  { institutionName: "Harvard University", dataset: "global", programName: "B.A. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.seas.harvard.edu/computer-science/undergraduate", verificationStatus: "VERIFIED" },
  { institutionName: "Georgia Institute of Technology", dataset: "global", programName: "B.S. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.cc.gatech.edu/academics/bachelor-science-computer-science", verificationStatus: "VERIFIED" },
  { institutionName: "Harvard University", dataset: "global", programName: "M.D.", degreeName: "MBBS", specializationName: null, level: "Doctoral", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://meded.hms.harvard.edu/md-program", verificationStatus: "VERIFIED" },
  { institutionName: "University of Oxford", dataset: "global", programName: "B.A. Biomedical Sciences", degreeName: "B.SC/B.TECH Biotechnology", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.ox.ac.uk/admissions/undergraduate/courses/biomedical-sciences", verificationStatus: "VERIFIED" },
  { institutionName: "ETH Zurich", dataset: "global", programName: "M.Sc. Data Science", degreeName: "B.SC/M.SC Data Science or Mathematics", specializationName: null, level: "Master's", studyMode: "Full-time", duration: "2 years", source: "official-website", sourceUrl: "https://ethz.ch/en/studies/master/data-science.html", verificationStatus: "VERIFIED" },
];

async function findDegree(name){
  if(!name) return null;
  let d=await prisma.degree.findFirst({where:{name}});
  if(d) return d;
  // try case-insensitive
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
  console.log(`=== Program Batch V1 (${mode}) ===`);
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
      if(!spec){
        console.log(`SKIP spec not found (will create without spec): ${p.specializationName} for ${p.degreeName}`);
      }
    }
    // duplicate check: same institution+degree+spec+name
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
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
