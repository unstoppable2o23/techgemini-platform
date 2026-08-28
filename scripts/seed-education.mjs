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
  "MD": "Master's",
  "MS": "Master's",
  "PhD": "Doctoral",
  "Diploma": "Diploma",
  "Certificate": "Certificate",
  "Integrated": "Integrated",
};

function extractDegreeInfo(degString) {
  const str = degString.trim();
  
  const patterns = [
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
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const degreeType = match[1].toUpperCase().replace(/\s+/g, '');
      const specialization = match[2] ? match[2].trim() : null;
      const cleanSpec = specialization ? specialization
        .replace(/\([^)]*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        : null;
      
      return {
        degreeType,
        specialization: cleanSpec || undefined,
      };
    }
  }

  const parts = str.split(/\s+/);
  if (parts.length >= 1) {
    const degreeType = parts[0].toUpperCase().replace(/\s+/g, '');
    const specialization = parts.slice(1).join(' ').replace(/\([^)]*\)/g, '').trim();
    return {
      degreeType,
      specialization: specialization || undefined,
    };
  }

  return { degreeType: str, specialization: undefined };
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
        const { degreeType, specialization } = extractDegreeInfo(degStr);
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
        
        const idx = data.deg.indexOf(degStr);
        const priority = idx === 0 ? "PRIMARY" : idx === 1 ? "ALTERNATIVE" : "OPTIONAL";
        
        careerPathways.push({
          careerName,
          degreeName,
          specialization,
          priority,
          minEdu: data.minEdu || "Bachelor's",
        });
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
    
    try {
      const degree = await prisma.degree.upsert({
        where: { name: degreeName },
        update: { educationLevel, category, isActive: true },
        create: {
          name: degreeName,
          slug: slugify(degreeName),
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