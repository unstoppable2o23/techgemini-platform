import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EDUCATION_LEVELS = {
  "B.Tech": "Bachelor's",
  "B.E.": "Bachelor's",
  "B.Sc": "Bachelor's",
  "BBA": "Bachelor's",
  "B.Com": "Bachelor's",
  "BA": "Bachelor's",
  "BCA": "Bachelor's",
  "B.Des": "Bachelor's",
  "B.Arch": "Bachelor's",
  "MBBS": "Bachelor's",
  "B.Pharm": "Bachelor's",
  "LLB": "Bachelor's",
  "B.Tech/B.E.": "Bachelor's",
  "B.Tech/B.E": "Bachelor's",
  "M.Tech": "Master's",
  "M.Sc": "Master's",
  "MBA": "Master's",
  "MCA": "Master's",
  "M.Des": "Master's",
  "M.Arch": "Master's",
  "M.LIB": "Master's",
  "MLIS": "Master's",
  "MD": "Master's",
  "MS": "Master's",
  "M.ED": "Master's",
  "M.PHARM": "Master's",
  "M.P.ED": "Master's",
  "MHA": "Master's",
  "MSW": "Master's",
  "M.PLAN": "Master's",
  "B.P.ED": "Bachelor's",
  "B.OPTOMETRY": "Bachelor's",
  "BHA": "Bachelor's",
  "BSW": "Bachelor's",
  "BOT": "Bachelor's",
  "BPT": "Bachelor's",
  "BFA": "Bachelor's",
  "BHM": "Bachelor's",
  "B.PLAN": "Bachelor's",
  "B.F.SC": "Bachelor's",
  "B.V.SC": "Bachelor's",
  "PGDIPLOMA": "Diploma",
  "PhD": "Doctoral",
  "Diploma": "Diploma",
  "Certificate": "Certificate",
  "Integrated": "Integrated",
};

const DEGREE_PATTERNS = [
  /^(B\.Tech\/?B\.E\.?)\s+(.+)$/i,
  /^(B\.E\.)\s+(.+)$/i,
  /^(B\.Tech)\s+(.+)$/i,
  /^(M\.Tech)\s+(.+)$/i,
  /^(M\.Sc)\s+(.+)$/i,
  /^(B\.Sc)\s+(.+)$/i,
  /^(BBA)\s+(.+)$/i,
  /^(B\.Com)\s+(.+)$/i,
  /^(BA)\s+(.+)$/i,
  /^(BCA)\s+(.+)$/i,
  /^(B\.Des)\s+(.+)$/i,
  /^(B\.Arch)\s+(.+)$/i,
  /^(MBBS)\s*(.*)$/i,
  /^(B\.Pharm)\s*(.*)$/i,
  /^(LLB)\s*(.*)$/i,
  /^(MCA)\s+(.+)$/i,
  /^(MBA)\s+(.+)$/i,
  /^(M\.Des)\s+(.+)$/i,
  /^(M\.Arch)\s+(.+)$/i,
  /^(Diploma)\s+(.+)$/i,
  /^(Certificate)\s+(.+)$/i,
  /^(Integrated)\s+(.+)$/i,
  /^(PhD)\s+(.+)$/i,
  /^(MD)\s+(.+)$/i,
  /^(MS)\s+(.+)$/i,
  /^(M\.Ed)\s*(.*)$/i,
  /^(M\.Pharm)\s*(.*)$/i,
  /^(M\.P\.Ed)\s*(.*)$/i,
  /^(B\.P\.Ed)\s*(.*)$/i,
  /^(B\.Optometry)\s*(.*)$/i,
  /^(BHA)\s*(.*)$/i,
  /^(MHA)\s*(.*)$/i,
  /^(BSW)\s*(.*)$/i,
  /^(MSW)\s*(.*)$/i,
  /^(BOT)\s*(.*)$/i,
  /^(BPT)\s*(.*)$/i,
  /^(BFA)\s*(.*)$/i,
  /^(BHM)\s*(.*)$/i,
  /^(B\.Plan)\s*(.*)$/i,
  /^(M\.Plan)\s*(.*)$/i,
  /^(PG Diploma)\s*(.*)$/i,
  /^(B\.F\.Sc)\s*(.*)$/i,
  /^(B\.V\.Sc)\s*(.*)$/i,
];

// Normalize a single degree requirement string into a { degreeType, specialization } pair.
function singleDegree(str) {
  const cleanSpec = (spec) => {
    if (!spec) return undefined;
    return spec
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^[()/]+|[()/]+$/g, '') || undefined;
  };
  for (const pattern of DEGREE_PATTERNS) {
    const match = str.match(pattern);
    if (match) {
      const degreeType = match[1].toUpperCase().replace(/\s+/g, '');
      return [{ degreeType, specialization: cleanSpec(match[2]) }];
    }
  }
  // Fallback (preserves prior behaviour): the first token is the degree type. This
  // keeps legitimate single degrees (M.LIB, B.V.Sc, CFA, ...) intact. Junk prefixes
  // are already filtered by the caller (ANY degree removed, slash combos split).
  const parts = str.split(/\s+/);
  const degreeType = parts[0].toUpperCase().replace(/\s+/g, '');
  const specialization = parts.slice(1).join(' ');
  return [{ degreeType, specialization: cleanSpec(specialization) }];
}

// Parse a possibly-combined degree requirement into one or more canonical degrees.
//  - Leading "ANY degree" is an eligibility note, not a specific Degree.
//  - Slash-combined prefixes (BCA/MCA, BBA/MBA, ...) are split into alternatives
//    EXCEPT the intentional "B.Tech/B.E." combined degree which stays single.
//  - Requirements joined by "+" (e.g. "B.Com/BBA + CFA") are treated as separate
//    alternatives; trailing certification/experience notes are still parsed via the
//    fallback, preserving existing behaviour.
const KNOWN_DEGREE_TYPES = new Set([
  "B.TECH", "B.E.", "B.SC", "BBA", "B.COM", "BA", "BCA", "B.DES", "B.ARCH",
  "MBBS", "B.PHARM", "LLB", "M.TECH", "M.SC", "MBA", "MCA", "M.DES", "M.ARCH",
  "DIPLOMA", "CERTIFICATE", "INTEGRATED", "PHD", "MD", "MS", "M.ED", "M.PHARM",
  "M.P.ED", "B.P.ED", "B.OPTOMETRY", "BHA", "MHA", "BSW", "MSW", "BOT", "BPT",
  "BFA", "BHM", "B.PLAN", "M.PLAN", "PGDIPLOMA", "B.F.SC", "B.V.SC", "B.TECH/B.E.",
]);

function isKnownDegree(token) {
  return KNOWN_DEGREE_TYPES.has(token.toUpperCase().replace(/\s+/g, ''));
}

function extractDegrees(raw) {
  const str = (raw || '').trim();
  // "ANY degree" (anywhere) is an eligibility note, not a specific Degree.
  let s = str.replace(/any degree/ig, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return [];

  const segments = s.split(/\s*\+\s*/).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const segRaw of segments) {
    const seg = segRaw.replace(/^[;()+,]+|[;()+,]+$/g, '').trim();
    if (!seg) continue;
    const slash = seg.match(/^([A-Za-z.]+(?:\/[A-Za-z.]+)+)\s*(.*)$/);
    if (slash) {
      const base = slash[1];
      const rest = slash[2] ? ' ' + slash[2].trim() : '';
      if (base.replace(/\./g, '').toLowerCase() === 'btechbee') {
        out.push(...singleDegree(seg));
      } else {
        // Only emit slash-combined alternatives that are real degree types.
        for (const p of base.split('/')) {
          if (!isKnownDegree(p)) continue;
          const r = singleDegree(`${p}${rest}`.trim());
          if (r.length) out.push(...r);
        }
      }
    } else if (/[A-Za-z]/.test(seg)) {
      out.push(...singleDegree(seg));
    }
  }
  return out;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedEducation() {
  console.log("Starting education data seeding...");

  const fs = await import("fs");
  
  const enrichmentFiles = [
    "scripts/career-intelligence/enrichment-engineering.json",
    "scripts/career-intelligence/enrichment-technology.json",
    "scripts/career-intelligence/enrichment-business-finance-marketing-sales.json",
    "scripts/career-intelligence/enrichment-health-law.json",
    "scripts/career-intelligence/enrichment-all-others.json",
  ];

  let allEnrichment = {};
  for (const file of enrichmentFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const data = JSON.parse(content);
      allEnrichment = { ...allEnrichment, ...data };
      console.log(`Loaded ${Object.keys(data).length} careers from ${file}`);
    } catch (e) {
      console.warn(`Could not load ${file}:`, e.message);
    }
  }

  console.log(`Total careers with enrichment: ${Object.keys(allEnrichment).length}`);

  // Collect all unique degrees, specializations, subjects
  const degreeMap = new Map(); // degreeName -> { degreeType, specializations: Set }
  const subjectSet = new Set();
  const careerPathways = []; // { careerName, degreeName, specialization, priority, minEdu }

  Object.entries(allEnrichment).forEach(([careerName, data]) => {
    if (data.deg) {
      data.deg.forEach(degStr => {
        const idx = data.deg.indexOf(degStr);
        const priority = idx === 0 ? "PRIMARY" : idx === 1 ? "ALTERNATIVE" : "OPTIONAL";
        const degrees = extractDegrees(degStr);
        for (const { degreeType, specialization } of degrees) {
          const degreeName = `${degreeType} ${specialization || ''}`.trim();

          if (!degreeMap.has(degreeName)) {
            degreeMap.set(degreeName, {
              degreeType,
              specializations: new Set(),
            });
          }
          if (specialization) {
            degreeMap.get(degreeName).specializations.add(specialization);
          }

          careerPathways.push({
            careerName,
            degreeName,
            specialization,
            priority,
            minEdu: data.minEdu || "Bachelor's",
          });
        }
      });
    }
    if (data.subj) {
      data.subj.forEach(s => subjectSet.add(s.trim()));
    }
  });

  console.log(`Unique degrees found: ${degreeMap.size}`);
  console.log(`Unique subjects found: ${subjectSet.size}`);

  // Create Degrees
  console.log("\n--- Creating Degrees ---");
  const degreeCache = new Map();
  
  for (const [degreeName, info] of degreeMap.entries()) {
    const educationLevel = EDUCATION_LEVELS[info.degreeType] || "Bachelor's";
    const category = educationLevel === "Bachelor's" ? "Undergraduate" : 
                     educationLevel === "Master's" ? "Graduate" : educationLevel;
    
    const degreeSlug = slugify(degreeName);
    try {
        const degree = await prisma.degree.upsert({
          where: { slug: degreeSlug },
          update: { name: degreeName, educationLevel, category, isActive: true },
          create: {
            name: degreeName,
            slug: degreeSlug,
            educationLevel,
            category,
            isActive: true,
          },
        });
      degreeCache.set(degreeName, degree.id);
    } catch (e) {
      console.warn(`  ✗ Failed ${degreeName}:`, e.message);
    }
  }
  console.log(`Created ${degreeCache.size} degrees`);

  // Create Specializations
  console.log("\n--- Creating Specializations ---");
  const specCache = new Map();
  
  for (const [degreeName, info] of degreeMap.entries()) {
    const degreeId = degreeCache.get(degreeName);
    if (!degreeId) continue;
    
    for (const spec of info.specializations) {
      const specKey = `${degreeName}_${spec}`;
      try {
        const specialization = await prisma.specialization.upsert({
          where: { degreeId_name: { degreeId, name: spec } },
          update: { isPrimary: true },
          create: {
            name: spec,
            slug: slugify(spec),
            degreeId,
            isPrimary: true,
          },
        });
        specCache.set(specKey, specialization.id);
      } catch (e) {
        console.warn(`  ✗ Failed ${degreeName} → ${spec}:`, e.message);
      }
    }
  }
  console.log(`Created ${specCache.size} specializations`);

  // Create Subjects
  console.log("\n--- Creating Subjects ---");
  const subjectCache = new Map();
  
  const subjectCategories = {
    "Physics": "Science",
    "Mathematics": "Science",
    "Chemistry": "Science",
    "Biology": "Science",
    "Computer Science": "Technology",
    "Statistics": "Science",
    "Economics": "Social Science",
    "Accountancy": "Commerce",
    "English": "Language",
    "History": "Social Science",
    "Geography": "Social Science",
    "Political Science": "Social Science",
    "Psychology": "Social Science",
    "Sociology": "Social Science",
    "Business Studies": "Commerce",
    "Informatics Practices": "Technology",
    "Entrepreneurship": "Commerce",
    "Physical Education": "Health",
    "Fine Arts": "Arts",
    "Music": "Arts",
    "Dance": "Arts",
  };

  for (const subjectName of subjectSet) {
    try {
      const category = subjectCategories[subjectName] || "Academic";
      const subject = await prisma.subject.upsert({
        where: { name: subjectName },
        update: { category, isActive: true },
        create: {
          name: subjectName,
          slug: slugify(subjectName),
          category,
          isActive: true,
        },
      });
      subjectCache.set(subjectName, subject.id);
    } catch (e) {
      console.warn(`  ✗ Failed ${subjectName}:`, e.message);
    }
  }
  console.log(`Created ${subjectCache.size} subjects`);

  // Load careers from database
  console.log("\n--- Loading Careers from DB ---");
  const careers = await prisma.career.findMany({
    select: { id: true, name: true },
  });
  const careerCache = new Map(careers.map(c => [c.name, c.id]));
  console.log(`Loaded ${careers.length} careers`);

  // Create CareerEducationPathways for degree/specialization pathways
  console.log("\n--- Creating CareerEducationPathways (Degree Pathways) ---");
  let pathwayCount = 0;
  
  for (const pathway of careerPathways) {
    const careerId = careerCache.get(pathway.careerName);
    const degreeId = degreeCache.get(pathway.degreeName);
    
    if (!careerId) {
      console.warn(`  ⚠ Career not found: ${pathway.careerName}`);
      continue;
    }
    if (!degreeId) {
      console.warn(`  ⚠ Degree not found: ${pathway.degreeName}`);
      continue;
    }

    let specializationId = null;
    if (pathway.specialization) {
      const specKey = `${pathway.degreeName}_${pathway.specialization}`;
      specializationId = specCache.get(specKey);
    }

    try {
      const exists = await prisma.careerEducationPathway.findFirst({
        where: { careerId, degreeId, specializationId, type: "DEGREE_PATHWAY", priority: pathway.priority },
      });
      if (exists) continue;
      await prisma.careerEducationPathway.create({
        data: {
          careerId,
          degreeId,
          specializationId,
          priority: pathway.priority,
          type: "DEGREE_PATHWAY",
          notes: `Minimum education: ${pathway.minEdu}`,
        },
      });
      pathwayCount++;
      console.log(`  ✓ ${pathway.careerName} → ${pathway.degreeName} (${pathway.priority})`);
    } catch (e) {
      console.warn(`  ✗ Failed ${pathway.careerName} → ${pathway.degreeName}:`, e.message);
    }
  }

  // Link recommendedSubjects to careers
  console.log("\n--- Linking Subjects to Careers ---");
  let subjectLinkCount = 0;
  
  for (const [careerName, data] of Object.entries(allEnrichment)) {
    const careerId = careerCache.get(careerName);
    if (!careerId || !data.subj) continue;
    
    // Find the PRIMARY degree for this career
    const primaryPathway = careerPathways.find(p => 
      p.careerName === careerName && p.priority === "PRIMARY"
    );
    
    for (const subjectName of data.subj) {
      const subjectId = subjectCache.get(subjectName.trim());
      if (!subjectId) continue;
      
    try {
      const exists = await prisma.careerEducationPathway.findFirst({
        where: { careerId, subjectId, type: "SUBJECT_LINK" },
      });
      if (exists) continue;
      await prisma.careerEducationPathway.create({
        data: {
          careerId,
          degreeId: primaryPathway?.degreeId ? degreeCache.get(primaryPathway.degreeName) : null,
          specializationId: null,
          subjectId,
          priority: "ALTERNATIVE",
          type: "SUBJECT_LINK",
          notes: "Recommended subject",
        },
      });
      subjectLinkCount++;
    } catch (e) {
      // Ignore duplicates
    }
    }
  }
  console.log(`Created ${subjectLinkCount} subject links`);

  console.log("\n=== Seeding Complete ===");
  console.log(`Degrees: ${degreeCache.size}`);
  console.log(`Specializations: ${specCache.size}`);
  console.log(`Subjects: ${subjectCache.size}`);
  console.log(`Career Pathways: ${pathwayCount}`);
  console.log(`Subject Links: ${subjectLinkCount}`);
}

seedEducation()
  .catch(e => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });