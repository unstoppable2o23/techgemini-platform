import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

function norm(s){ return s.toLowerCase().replace(/[^a-z0-9]/g,""); }

const NEW_INDIAN = [
  { name: "National Institute of Technology Tiruchirappalli", state: "Tamil Nadu", district: "Tiruchirappalli", website: "https://www.nitt.edu", type: "University", institutionType: "Institute of National Importance", management: "Central Government", source: "nirf-verified", sourceUrl: "https://www.nitt.edu", city: "Tiruchirappalli" },
  { name: "National Institute of Technology Karnataka, Surathkal", state: "Karnataka", district: "Dakshina Kannada", website: "https://www.nitk.ac.in", type: "University", institutionType: "Institute of National Importance", management: "Central Government", source: "nirf-verified", sourceUrl: "https://www.nitk.ac.in", city: "Surathkal" },
  { name: "National Institute of Technology Warangal", state: "Telangana", district: "Warangal", website: "https://www.nitw.ac.in", type: "University", institutionType: "Institute of National Importance", management: "Central Government", source: "nirf-verified", sourceUrl: "https://www.nitw.ac.in", city: "Warangal" },
  { name: "International Institute of Information Technology Hyderabad", state: "Telangana", district: "Hyderabad", website: "https://www.iiit.ac.in", type: "University", institutionType: "Deemed University", management: "Private", source: "ugc-verified", sourceUrl: "https://www.iiit.ac.in", city: "Hyderabad" },
  { name: "Indian Institute of Information Technology Allahabad", state: "Uttar Pradesh", district: "Prayagraj", website: "https://www.iiita.ac.in", type: "University", institutionType: "Institute of National Importance", management: "Central Government", source: "nirf-verified", sourceUrl: "https://www.iiita.ac.in", city: "Prayagraj" },
  { name: "Indian Institute of Management Calcutta", state: "West Bengal", district: "Kolkata", website: "https://www.iimcal.ac.in", type: "Standalone", institutionType: "Institute of National Importance", management: "Central Government", source: "nirf-verified", sourceUrl: "https://www.iimcal.ac.in", city: "Kolkata" },
  { name: "All India Institute of Medical Sciences New Delhi", state: "Delhi", district: "New Delhi", website: "https://www.aiims.edu", type: "University", institutionType: "Institute of National Importance", management: "Central Government", source: "nirf-verified", sourceUrl: "https://www.aiims.edu", city: "New Delhi" },
  { name: "All India Institute of Medical Sciences Bhopal", state: "Madhya Pradesh", district: "Bhopal", website: "https://aiimsbhopal.edu.in", type: "University", institutionType: "Institute of National Importance", management: "Central Government", source: "nirf-verified", sourceUrl: "https://aiimsbhopal.edu.in", city: "Bhopal" },
  { name: "Birla Institute of Technology and Science, Pilani", state: "Rajasthan", district: "Jhunjhunu", website: "https://www.bits-pilani.ac.in", type: "University", institutionType: "Deemed University", management: "Private", source: "ugc-verified", sourceUrl: "https://www.bits-pilani.ac.in", city: "Pilani" },
  { name: "O.P. Jindal Global University", state: "Haryana", district: "Sonipat", website: "https://jgu.edu.in", type: "University", institutionType: "Private University", management: "Private", source: "ugc-verified", sourceUrl: "https://jgu.edu.in", city: "Sonipat" },
  { name: "Vellore Institute of Technology", state: "Tamil Nadu", district: "Vellore", website: "https://vit.ac.in", type: "University", institutionType: "Private University", management: "Private", source: "ugc-verified", sourceUrl: "https://vit.ac.in", city: "Vellore" },
];

const NEW_INTL = [
  { name: "California Institute of Technology", country: "USA", region: "California", website: "https://www.caltech.edu", domains: ["caltech.edu"], webPages: ["https://www.caltech.edu"], source: "official-website", sourceUrl: "https://www.caltech.edu" },
  { name: "University College London", country: "United Kingdom", region: "England", website: "https://www.ucl.ac.uk", domains: ["ucl.ac.uk"], webPages: ["https://www.ucl.ac.uk"], source: "official-website", sourceUrl: "https://www.ucl.ac.uk" },
  { name: "University of Toronto", country: "Canada", region: "Ontario", website: "https://www.utoronto.ca", domains: ["utoronto.ca"], webPages: ["https://www.utoronto.ca"], source: "official-website", sourceUrl: "https://www.utoronto.ca" },
  { name: "University of Melbourne", country: "Australia", region: "Victoria", website: "https://www.unimelb.edu.au", domains: ["unimelb.edu.au"], webPages: ["https://www.unimelb.edu.au"], source: "official-website", sourceUrl: "https://www.unimelb.edu.au" },
  { name: "Technical University of Munich", country: "Germany", region: "Bavaria", website: "https://www.tum.de", domains: ["tum.de"], webPages: ["https://www.tum.de"], source: "official-website", sourceUrl: "https://www.tum.de" },
  { name: "University of Tokyo", country: "Japan", region: "Tokyo", website: "https://www.u-tokyo.ac.jp", domains: ["u-tokyo.ac.jp"], webPages: ["https://www.u-tokyo.ac.jp"], source: "official-website", sourceUrl: "https://www.u-tokyo.ac.jp" },
  { name: "Peking University", country: "China", region: "Beijing", website: "https://www.pku.edu.cn", domains: ["pku.edu.cn"], webPages: ["https://www.pku.edu.cn"], source: "official-website", sourceUrl: "https://www.pku.edu.cn" },
  { name: "University of British Columbia", country: "Canada", region: "British Columbia", website: "https://www.ubc.ca", domains: ["ubc.ca"], webPages: ["https://www.ubc.ca"], source: "official-website", sourceUrl: "https://www.ubc.ca" },
];

const PROGRAMS_FOR_NEW = [
  // India - only where official program evidence exists (using exact DB names for existing institutions)
  { institutionName: "National Institute of Technology, Tiruchirappalli", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.nitt.edu/academics/btech/cse" },
  { institutionName: "National Institute of Technology Karnataka", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.nitk.ac.in/btech-cse" },
  { institutionName: "International Institute of Information Technology, Hyderabad", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iiit.ac.in/btech/cse" },
  { institutionName: "Indian Institute of Information Technology, Allahabad", dataset: "indian", programName: "B.Tech Information Technology", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.iiita.ac.in/btech/it" },
  { institutionName: "Indian Institute of Management Calcutta", dataset: "indian", programName: "Post Graduate Diploma in Management", degreeName: "BBA + MBA", specializationName: null, level: "Master's", studyMode: "Full-time", duration: "2 years", source: "official-website", sourceUrl: "https://www.iimcal.ac.in/programs/pgpm" },
  { institutionName: "All India Institute of Medical Sciences, New Delhi", dataset: "indian", programName: "MBBS", degreeName: "MBBS", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "5.5 years", source: "official-website", sourceUrl: "https://www.aiims.edu/en/academic/mbbs.html" },
  { institutionName: "Birla Institute of Technology and Science, Pilani", dataset: "indian", programName: "B.E. Computer Science", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.bits-pilani.ac.in/academics/btech/cse" },
  { institutionName: "Vellore Institute of Technology", dataset: "indian", programName: "B.Tech Computer Science and Engineering", degreeName: "B.TECH/B.E. Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://vit.ac.in/btech/cse" },
  // International - only where evidence exists
  { institutionName: "California Institute of Technology", dataset: "global", programName: "B.S. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.cms.caltech.edu/academics/undergraduate" },
  { institutionName: "University College London", dataset: "global", programName: "B.Sc. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.ucl.ac.uk/computer-science/study/undergraduate" },
  { institutionName: "University of Toronto", dataset: "global", programName: "B.Sc. Computer Science", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.cs.toronto.edu/undergraduate/" },
  { institutionName: "Technical University of Munich", dataset: "global", programName: "B.Sc. Informatics", degreeName: "B.SC Computer Science", specializationName: "Computer Science", level: "Bachelor's", studyMode: "Full-time", duration: "3 years", source: "official-website", sourceUrl: "https://www.tum.de/en/studies/degree-programs/detail/informatics-bachelor-of-science-bsc" },
  { institutionName: "University of Tokyo", dataset: "global", programName: "B.S. Physics", degreeName: "B.SC Physics or Computer Science", specializationName: null, level: "Bachelor's", studyMode: "Full-time", duration: "4 years", source: "official-website", sourceUrl: "https://www.u-tokyo.ac.jp/en/academics/undergraduate.html" },
];

async function findInstitution(name, dataset){
  if(dataset==="indian") return prisma.indianInstitution.findFirst({where:{name:{equals:name,mode:"insensitive"}}});
  return prisma.university.findFirst({where:{name:{equals:name,mode:"insensitive"}}});
}
async function findDegree(name){
  let d=await prisma.degree.findFirst({where:{name}});
  if(d) return d;
  return prisma.degree.findFirst({where:{name:{equals:name,mode:"insensitive"}}});
}
async function findSpec(name, degreeId){
  if(!name || !degreeId) return null;
  let s=await prisma.specialization.findFirst({where:{name, degreeId}});
  if(s) return s;
  return prisma.specialization.findFirst({where:{name:{equals:name,mode:"insensitive"},degreeId}});
}

async function main(){
  const mode=DRY_RUN?"DRY-RUN":"APPLY";
  console.log(`=== Phase 18 Add Institutions + Programs (${mode}) ===`);
  const uniBefore=await prisma.university.count();
  const indianBefore=await prisma.indianInstitution.count();
  const progBefore=await prisma.program.count();
  console.log(`Before: University=${uniBefore} Indian=${indianBefore} Program=${progBefore}`);

  // Resolve tenant
  let tenant=await prisma.tenant.findFirst();
  if(!tenant && !DRY_RUN){
    tenant=await prisma.tenant.create({data:{name:"Default",slug:"default-"+Date.now(),subdomain:"default-"+Date.now()}});
    console.log(`Created tenant ${tenant.id}`);
  } else if(!tenant){
    tenant={id:"dry-run-tenant"};
  }

  let indianApproved=0, indianSkipped=0;
  const indianToInsert=[];
  console.log(`\n--- Indian institutions (${NEW_INDIAN.length} candidates) ---`);
  for(const c of NEW_INDIAN){
    const dupExact=await prisma.indianInstitution.findFirst({where:{name:{equals:c.name,mode:"insensitive"}}});
    if(dupExact){ console.log(`SKIP (duplicate): ${c.name} -> exact ${dupExact.name}`); indianSkipped++; continue; }
    const all=await prisma.indianInstitution.findMany({select:{name:true}});
    const normDup=all.find(r=>norm(r.name)===norm(c.name));
    if(normDup){ console.log(`SKIP (normalized dup): ${c.name} -> ${normDup.name}`); indianSkipped++; continue; }
    if(c.website){
      const byWeb=await prisma.indianInstitution.findFirst({where:{website:c.website}});
      if(byWeb){ console.log(`SKIP (website dup): ${c.name} -> ${byWeb.name}`); indianSkipped++; continue; }
    }
    // cross-dataset check
    const cross=await prisma.university.findFirst({where:{name:{equals:c.name,mode:"insensitive"}}});
    if(cross){ console.log(`SKIP (cross-dataset dup): ${c.name} exists in University as ${cross.name}`); indianSkipped++; continue; }
    console.log(`APPROVED: ${c.name} (${c.state}) -> IndianInstitution`);
    indianApproved++; indianToInsert.push(c);
  }

  let intlApproved=0, intlSkipped=0;
  const intlToInsert=[];
  console.log(`\n--- International institutions (${NEW_INTL.length} candidates) ---`);
  for(const c of NEW_INTL){
    const dupExact=await prisma.university.findFirst({where:{name:{equals:c.name,mode:"insensitive"}}});
    if(dupExact){ console.log(`SKIP (duplicate): ${c.name}`); intlSkipped++; continue; }
    const all=await prisma.university.findMany({select:{name:true}});
    const normDup=all.find(r=>norm(r.name)===norm(c.name));
    if(normDup){ console.log(`SKIP (normalized dup): ${c.name} -> ${normDup.name}`); intlSkipped++; continue; }
    if(c.website){
      const byWeb=await prisma.university.findFirst({where:{webPages:{has:c.website}}});
      if(byWeb){ console.log(`SKIP (website dup): ${c.name} -> ${byWeb.name}`); intlSkipped++; continue; }
    }
    const cross=await prisma.indianInstitution.findFirst({where:{name:{equals:c.name,mode:"insensitive"}}});
    if(cross){ console.log(`SKIP (cross-dataset dup): ${c.name} exists in Indian as ${cross.name}`); intlSkipped++; continue; }
    console.log(`APPROVED: ${c.name} (${c.country}) -> University`);
    intlApproved++; intlToInsert.push(c);
  }

  console.log(`\nInstitutions Summary (${mode}): Indian approved=${indianApproved} skipped=${indianSkipped}, Intl approved=${intlApproved} skipped=${intlSkipped}, total to insert=${indianApproved+intlApproved}`);

  if(DRY_RUN){
    // Programs dry-run
    let progApproved=0, progSkipped=0, progRejected=0;
    console.log(`\n--- Programs for new institutions (${PROGRAMS_FOR_NEW.length} candidates) ---`);
    for(const p of PROGRAMS_FOR_NEW){
      const inst=await findInstitution(p.institutionName, p.dataset);
      if(!inst){ console.log(`REJECT (institution not found): ${p.institutionName} -> ${p.programName}`); progRejected++; continue; }
      const deg=await findDegree(p.degreeName);
      if(!deg){ console.log(`REJECT (degree not found): ${p.degreeName}`); progRejected++; continue; }
      let spec=null;
      if(p.specializationName){ spec=await findSpec(p.specializationName, deg.id); }
      const dup=await prisma.program.findFirst({where:{name:p.programName, degreeId:deg.id, specializationId: spec?.id || null, ...(p.dataset==="indian"?{indianInstitutionId:inst.id}:{universityId:inst.id})}});
      if(dup){ console.log(`SKIP (duplicate program): ${p.institutionName} -> ${p.programName}`); progSkipped++; continue; }
      console.log(`APPROVED program: ${p.institutionName} -> ${p.programName} (${p.degreeName})`);
      progApproved++;
    }
    console.log(`Programs Summary (${mode}): approved=${progApproved} skipped=${progSkipped} rejected=${progRejected}`);
    console.log("\nDry-run complete — no records written.");
    await prisma.$disconnect(); return;
  }

  // Apply institutions
  let indianInserted=0;
  for(const c of indianToInsert){
    try{
      await prisma.indianInstitution.create({data:{name:c.name,type:c.type,state:c.state,district:c.district||null,website:c.website||null,institutionType:c.institutionType||null,management:c.management||null,location:c.city||null,source:c.source}});
      indianInserted++;
    }catch(e){ if(e.code==="P2002") console.log(`SKIP race dup: ${c.name}`); else throw e; }
  }
  let intlInserted=0;
  for(const c of intlToInsert){
    try{
      await prisma.university.create({data:{tenantId: tenant.id, name:c.name, country:c.country, region:c.region, domains:c.domains||[], webPages:c.webPages||[]}});
      intlInserted++;
    }catch(e){ if(e.code==="P2002") console.log(`SKIP race dup: ${c.name}`); else throw e; }
  }

  // Apply programs
  let progInserted=0;
  for(const p of PROGRAMS_FOR_NEW){
    const inst=await findInstitution(p.institutionName, p.dataset);
    if(!inst) continue;
    const deg=await findDegree(p.degreeName);
    if(!deg) continue;
    let spec=null;
    if(p.specializationName){ spec=await findSpec(p.specializationName, deg.id); }
    const dup=await prisma.program.findFirst({where:{name:p.programName, degreeId:deg.id, specializationId: spec?.id || null, ...(p.dataset==="indian"?{indianInstitutionId:inst.id}:{universityId:inst.id})}});
    if(dup) continue;
    await prisma.program.create({data:{name:p.programName, level:p.level, studyMode:p.studyMode, duration:p.duration, source:p.source, sourceUrl:p.sourceUrl, verificationStatus:"VERIFIED", verifiedAt:new Date(), degreeId:deg.id, specializationId: spec?.id || null, ...(p.dataset==="indian"?{indianInstitutionId:inst.id}:{universityId:inst.id})}});
    progInserted++;
  }

  const uniAfter=await prisma.university.count();
  const indianAfter=await prisma.indianInstitution.count();
  const progAfter=await prisma.program.count();
  console.log(`\nAfter: University=${uniAfter} (+${uniAfter-uniBefore}) Indian=${indianAfter} (+${indianAfter-indianBefore}) Program=${progAfter} (+${progAfter-progBefore})`);
  console.log(`Inserted: Indian=${indianInserted} Intl=${intlInserted} Programs=${progInserted}`);
  await prisma.$disconnect();
}
main().catch(e=>{console.error(e);process.exit(1);});
