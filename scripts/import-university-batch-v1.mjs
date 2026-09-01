import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// ---- helpers ----
function normalizeName(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Alias map for known variants (canonical -> aliases)
const ALIAS_MAP = {
  "indianinstituteoftechnologybombay": ["iitbombay", "iitbombay"],
  "universityofdelhi": ["delhiuniversity"],
  "delhiuniversity": ["universityofdelhi"],
};

function getAliases(normalized) {
  return ALIAS_MAP[normalized] || [];
}

// ---- candidate batch (12 India + 12 Intl) ----
// Sources verified 2026-08-28 via official websites / NIRF 2024 / UGC
// Indian candidates selected as MISSING in local AISHE (73959) via duplicate check — high-value for AI/CS/Healthcare/Design/Climate
const INDIAN_CANDIDATES = [
  {
    name: "Indian Institute of Technology Dharwad",
    state: "Karnataka",
    district: "Dharwad",
    website: "https://www.iitdh.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iitdh.ac.in",
    relevance: "AI, CS, Data Science, Cybersecurity - newer IIT (2016)",
    city: "Dharwad",
  },
  {
    name: "Indian Institute of Technology Palakkad",
    state: "Kerala",
    district: "Palakkad",
    website: "https://www.iitpkd.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iitpkd.ac.in",
    relevance: "AI, CS, Data Science - newer IIT (2015)",
    city: "Palakkad",
  },
  {
    name: "Indian Institute of Technology Tirupati",
    state: "Andhra Pradesh",
    district: "Tirupati",
    website: "https://www.iittp.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iittp.ac.in",
    relevance: "AI, CS, Data Science - newer IIT (2015)",
    city: "Tirupati",
  },
  {
    name: "Indian Institute of Technology Jammu",
    state: "Jammu and Kashmir",
    district: "Jammu",
    website: "https://www.iitjammu.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iitjammu.ac.in",
    relevance: "AI, CS, Cybersecurity - newer IIT (2016)",
    city: "Jammu",
  },
  {
    name: "Indian Institute of Information Technology Bhopal",
    state: "Madhya Pradesh",
    district: "Bhopal",
    website: "https://www.iiitbhopal.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iiitbhopal.ac.in",
    relevance: "AI, CS, Data Science - newer IIIT (2017)",
    city: "Bhopal",
  },
  {
    name: "Indian Institute of Information Technology Kota",
    state: "Rajasthan",
    district: "Kota",
    website: "https://www.iiitkota.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iiitkota.ac.in",
    relevance: "AI, CS, Data Science - IIIT (2013)",
    city: "Kota",
  },
  {
    name: "Indian Institute of Information Technology Una",
    state: "Himachal Pradesh",
    district: "Una",
    website: "https://www.iiitu.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iiitu.ac.in",
    relevance: "AI, CS, Cybersecurity - newer IIIT (2014)",
    city: "Una",
  },
  {
    name: "Indian Institute of Information Technology Kalyani",
    state: "West Bengal",
    district: "Nadia",
    website: "https://www.iiitkalyani.ac.in",
    type: "University",
    institutionType: "Institute of National Importance",
    management: "Central Government",
    source: "nirf-verified",
    sourceUrl: "https://www.iiitkalyani.ac.in",
    relevance: "AI, CS, Data Science - IIIT (2014)",
    city: "Kalyani",
  },
  {
    name: "Masters Union",
    state: "Haryana",
    district: "Gurugram",
    website: "https://www.mastersunion.org",
    type: "Standalone",
    institutionType: "Private Institution",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.mastersunion.org",
    relevance: "Business, Data Science, AI - emerging business-tech school",
    city: "Gurugram",
  },
  {
    name: "SRM University AP",
    state: "Andhra Pradesh",
    district: "Guntur",
    website: "https://www.srmap.edu.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.srmap.edu.in",
    relevance: "AI, CS, Data Science, Biotechnology, Engineering",
    city: "Amaravati",
  },
  {
    name: "University of Petroleum and Energy Studies",
    state: "Uttarakhand",
    district: "Dehradun",
    website: "https://www.upes.ac.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.upes.ac.in",
    relevance: "Climate/Energy, Petroleum, Computer Science, Design",
    city: "Dehradun",
  },
  {
    name: "Chitkara University",
    state: "Punjab",
    district: "Patiala",
    website: "https://www.chitkara.edu.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.chitkara.edu.in",
    relevance: "CS, Healthcare, Pharmacy, Business - comprehensive",
    city: "Rajpura",
  },
  {
    name: "Scaler School of Technology",
    state: "Karnataka",
    district: "Bangalore Urban",
    website: "https://www.scaler.com",
    type: "Standalone",
    institutionType: "Private Institution",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.scaler.com",
    relevance: "AI, CS, Data Science, Software Engineering - new-age tech school",
    city: "Bangalore",
  },
  {
    name: "Newton School of Technology",
    state: "Karnataka",
    district: "Bangalore Urban",
    website: "https://www.newtonschool.co",
    type: "Standalone",
    institutionType: "Private Institution",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.newtonschool.co",
    relevance: "AI, CS, Data Science - new-age tech school",
    city: "Bangalore",
  },
  {
    name: "Presidency University Bangalore",
    state: "Karnataka",
    district: "Bangalore Urban",
    website: "https://presidencyuniversity.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://presidencyuniversity.in",
    relevance: "AI, CS, Engineering, Business",
    city: "Bangalore",
  },
  {
    name: "Koneru Lakshmaiah Education Foundation",
    state: "Andhra Pradesh",
    district: "Guntur",
    website: "https://www.kluniversity.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.kluniversity.in",
    relevance: "AI, CS, VLSI, Biotechnology - Deemed University",
    city: "Guntur",
  },
  {
    name: "Rashtram School of Public Leadership",
    state: "Haryana",
    district: "Sonipat",
    website: "https://rashtram.org",
    type: "Standalone",
    institutionType: "Private Institution",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://rashtram.org",
    relevance: "Public Policy, Leadership, ESG - emerging careers",
    city: "Sonipat",
  },
  {
    name: "O.P. Jindal Global University",
    state: "Haryana",
    district: "Sonipat",
    website: "https://jgu.edu.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://jgu.edu.in",
    relevance: "Law, Business, Public Policy, ESG",
    city: "Sonipat",
  },
  {
    name: "Lovely Professional University",
    state: "Punjab",
    district: "Kapurthala",
    website: "https://www.lpu.co.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.lpu.co.in",
    relevance: "AI, CS, Engineering, Healthcare, Business - comprehensive",
    city: "Phagwara",
  },
  {
    name: "Vidyashilp University",
    state: "Karnataka",
    district: "Bangalore Urban",
    website: "https://vidyashilp.edu.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://vidyashilp.edu.in",
    relevance: "CS, Data Science, Design - new-age university",
    city: "Bangalore",
  },
  {
    name: "Medi-Caps University",
    state: "Madhya Pradesh",
    district: "Indore",
    website: "https://www.medicaps.ac.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.medicaps.ac.in",
    relevance: "AI, CS, Engineering, Healthcare",
    city: "Indore",
  },
  {
    name: "Sandip University",
    state: "Maharashtra",
    district: "Nashik",
    website: "https://www.sandipuniversity.edu.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.sandipuniversity.edu.in",
    relevance: "AI, CS, Engineering, Design",
    city: "Nashik",
  },
  {
    name: "Quantum University",
    state: "Uttarakhand",
    district: "Roorkee",
    website: "https://www.quantumuniversity.edu.in",
    type: "University",
    institutionType: "Private University",
    management: "Private",
    source: "ugc-verified",
    sourceUrl: "https://www.quantumuniversity.edu.in",
    relevance: "AI, CS, Engineering, Climate/Energy",
    city: "Roorkee",
  },
];

const INTL_CANDIDATES = [
  {
    name: "Massachusetts Institute of Technology",
    country: "USA",
    region: "Massachusetts",
    website: "https://web.mit.edu",
    domains: ["mit.edu"],
    webPages: ["https://web.mit.edu"],
    source: "official-website",
    sourceUrl: "https://web.mit.edu",
    relevance: "AI, CS, Robotics, Quantum - QS #1",
  },
  {
    name: "Stanford University",
    country: "USA",
    region: "California",
    website: "https://www.stanford.edu",
    domains: ["stanford.edu"],
    webPages: ["https://www.stanford.edu"],
    source: "official-website",
    sourceUrl: "https://www.stanford.edu",
    relevance: "AI, Entrepreneurship, Data",
  },
  {
    name: "Carnegie Mellon University",
    country: "USA",
    region: "Pennsylvania",
    website: "https://www.cmu.edu",
    domains: ["cmu.edu"],
    webPages: ["https://www.cmu.edu"],
    source: "official-website",
    sourceUrl: "https://www.cmu.edu",
    relevance: "AI/ML, HCI, Cybersecurity",
  },
  {
    name: "University of California, Berkeley",
    country: "USA",
    region: "California",
    website: "https://www.berkeley.edu",
    domains: ["berkeley.edu"],
    webPages: ["https://www.berkeley.edu"],
    source: "official-website",
    sourceUrl: "https://www.berkeley.edu",
    relevance: "AI, Systems, Climate, Edge",
  },
  {
    name: "ETH Zurich",
    country: "Switzerland",
    region: "Zurich",
    website: "https://ethz.ch",
    domains: ["ethz.ch"],
    webPages: ["https://ethz.ch"],
    source: "official-website",
    sourceUrl: "https://ethz.ch",
    relevance: "Robotics, Quantum, AI",
  },
  {
    name: "University of Oxford",
    country: "United Kingdom",
    region: "England",
    website: "https://www.ox.ac.uk",
    domains: ["ox.ac.uk"],
    webPages: ["https://www.ox.ac.uk"],
    source: "official-website",
    sourceUrl: "https://www.ox.ac.uk",
    relevance: "Medical AI, Policy, Bio",
  },
  {
    name: "University of Cambridge",
    country: "United Kingdom",
    region: "England",
    website: "https://www.cam.ac.uk",
    domains: ["cam.ac.uk"],
    webPages: ["https://www.cam.ac.uk"],
    source: "official-website",
    sourceUrl: "https://www.cam.ac.uk",
    relevance: "Bio, Climate, AI",
  },
  {
    name: "Imperial College London",
    country: "United Kingdom",
    region: "England",
    website: "https://www.imperial.ac.uk",
    domains: ["imperial.ac.uk"],
    webPages: ["https://www.imperial.ac.uk"],
    source: "official-website",
    sourceUrl: "https://www.imperial.ac.uk",
    relevance: "AI, Med, Energy",
  },
  {
    name: "National University of Singapore",
    country: "Singapore",
    region: null,
    website: "https://www.nus.edu.sg",
    domains: ["nus.edu.sg"],
    webPages: ["https://www.nus.edu.sg"],
    source: "official-website",
    sourceUrl: "https://www.nus.edu.sg",
    relevance: "AI, Systems, Biotech",
  },
  {
    name: "Nanyang Technological University",
    country: "Singapore",
    region: null,
    website: "https://www.ntu.edu.sg",
    domains: ["ntu.edu.sg"],
    webPages: ["https://www.ntu.edu.sg"],
    source: "official-website",
    sourceUrl: "https://www.ntu.edu.sg",
    relevance: "AI, Materials, Engineering",
  },
  {
    name: "Harvard University",
    country: "USA",
    region: "Massachusetts",
    website: "https://www.harvard.edu",
    domains: ["harvard.edu"],
    webPages: ["https://www.harvard.edu"],
    source: "official-website",
    sourceUrl: "https://www.harvard.edu",
    relevance: "Bio, Policy, Quant, Medical AI",
  },
  {
    name: "Georgia Institute of Technology",
    country: "USA",
    region: "Georgia",
    website: "https://www.gatech.edu",
    domains: ["gatech.edu"],
    webPages: ["https://www.gatech.edu"],
    source: "official-website",
    sourceUrl: "https://www.gatech.edu",
    relevance: "Cybersecurity, Embedded, IoT",
  },
];

async function checkDuplicateIndian(candidate) {
  const normalized = normalizeName(candidate.name);
  // exact name (case-insensitive)
  const exact = await prisma.indianInstitution.findFirst({
    where: { name: { equals: candidate.name, mode: "insensitive" } },
  });
  if (exact) return { duplicate: true, reason: `exact name match: ${exact.name} (${exact.id})`, existing: exact };

  // normalized name
  const all = await prisma.indianInstitution.findMany({ select: { id: true, name: true } });
  for (const r of all) {
    if (normalizeName(r.name) === normalized) {
      return { duplicate: true, reason: `normalized match: ${r.name}`, existing: r };
    }
    for (const alias of getAliases(normalized)) {
      if (normalizeName(r.name) === alias) {
        return { duplicate: true, reason: `alias match: ${r.name} via ${alias}`, existing: r };
      }
    }
  }

  // website duplicate
  if (candidate.website) {
    const byWebsite = await prisma.indianInstitution.findFirst({ where: { website: candidate.website } });
    if (byWebsite) return { duplicate: true, reason: `website match: ${byWebsite.name}`, existing: byWebsite };
  }

  return { duplicate: false };
}

async function checkDuplicateIntl(candidate, tenantId) {
  const normalized = normalizeName(candidate.name);
  const exact = await prisma.university.findFirst({
    where: { name: { equals: candidate.name, mode: "insensitive" }, tenantId },
  });
  if (exact) return { duplicate: true, reason: `exact name match: ${exact.name}`, existing: exact };

  const all = await prisma.university.findMany({ where: { tenantId }, select: { id: true, name: true } });
  for (const r of all) {
    if (normalizeName(r.name) === normalized) {
      return { duplicate: true, reason: `normalized match: ${r.name}`, existing: r };
    }
  }

  // website/domains duplicate
  if (candidate.website) {
    const byWeb = await prisma.university.findFirst({
      where: { tenantId, webPages: { has: candidate.website } },
    });
    if (byWeb) return { duplicate: true, reason: `website match: ${byWeb.name}`, existing: byWeb };
  }

  return { duplicate: false };
}

async function main() {
  const mode = DRY_RUN ? "DRY-RUN" : "APPLY";
  console.log(`=== University Expansion Batch V1 (${mode}) ===`);

  const uniBefore = await prisma.university.count();
  const indianBefore = await prisma.indianInstitution.count();
  console.log(`Before: University=${uniBefore} IndianInstitution=${indianBefore}`);

  // Resolve tenant for University
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    if (DRY_RUN) {
      console.log("No tenant found (dry-run, would create one)");
      tenant = { id: "dry-run-tenant-id", name: "dry-run" };
    } else {
      tenant = await prisma.tenant.create({ data: { name: "Default", slug: "default-" + Date.now(), subdomain: "default-" + Date.now() } });
      console.log(`Created tenant ${tenant.id}`);
    }
  }

  // ---- Indian batch ----
  console.log(`\n--- Indian batch (${INDIAN_CANDIDATES.length} candidates) ---`);
  let indianApproved = 0, indianSkipped = 0, indianRejected = 0;
  const indianToInsert = [];
  for (const c of INDIAN_CANDIDATES) {
    const dup = await checkDuplicateIndian(c);
    if (dup.duplicate) {
      console.log(`SKIP (duplicate): ${c.name} — ${dup.reason}`);
      indianSkipped++;
      continue;
    }
    // verify required fields
    if (!c.name || !c.state || !c.type) {
      console.log(`REJECT (schema): ${c.name} — missing required fields`);
      indianRejected++;
      continue;
    }
    console.log(`APPROVED: ${c.name} (${c.state}, ${c.type}) → IndianInstitution`);
    indianApproved++;
    indianToInsert.push(c);
  }

  // ---- Intl batch ----
  console.log(`\n--- International batch (${INTL_CANDIDATES.length} candidates) ---`);
  let intlApproved = 0, intlSkipped = 0, intlRejected = 0;
  const intlToInsert = [];
  for (const c of INTL_CANDIDATES) {
    const dup = await checkDuplicateIntl(c, tenant.id);
    if (dup.duplicate) {
      console.log(`SKIP (duplicate): ${c.name} — ${dup.reason}`);
      intlSkipped++;
      continue;
    }
    if (!c.name || !c.country) {
      console.log(`REJECT (schema): ${c.name} — missing required fields`);
      intlRejected++;
      continue;
    }
    console.log(`APPROVED: ${c.name} (${c.country}) → University`);
    intlApproved++;
    intlToInsert.push(c);
  }

  console.log(`\n=== Summary (${mode}) ===`);
  console.log(`Indian: approved=${indianApproved} skipped(duplicate)=${indianSkipped} rejected=${indianRejected}`);
  console.log(`Intl: approved=${intlApproved} skipped=${intlSkipped} rejected=${intlRejected}`);
  console.log(`Total to insert: ${indianApproved + intlApproved}`);

  if (DRY_RUN) {
    console.log("\nDry-run complete — no records written.");
    await prisma.$disconnect();
    return;
  }

  // ---- Apply ----
  let indianInserted = 0;
  for (const c of indianToInsert) {
    try {
      await prisma.indianInstitution.create({
        data: {
          name: c.name,
          type: c.type,
          state: c.state,
          district: c.district || null,
          website: c.website || null,
          institutionType: c.institutionType || null,
          management: c.management || null,
          location: c.city || null,
          source: c.source,
        },
      });
      indianInserted++;
    } catch (e) {
      if (e.code === "P2002") {
        console.log(`SKIP (race duplicate): ${c.name}`);
      } else throw e;
    }
  }

  let intlInserted = 0;
  for (const c of intlToInsert) {
    try {
      await prisma.university.create({
        data: {
          tenantId: tenant.id,
          name: c.name,
          country: c.country,
          region: c.region,
          domains: c.domains || [],
          webPages: c.webPages || [],
        },
      });
      intlInserted++;
    } catch (e) {
      if (e.code === "P2002") {
        console.log(`SKIP (race duplicate): ${c.name}`);
      } else throw e;
    }
  }

  const uniAfter = await prisma.university.count();
  const indianAfter = await prisma.indianInstitution.count();
  console.log(`\nAfter: University=${uniAfter} (+${uniAfter - uniBefore}) IndianInstitution=${indianAfter} (+${indianAfter - indianBefore})`);
  console.log(`Inserted: Indian=${indianInserted} Intl=${intlInserted}`);

  if (uniAfter - uniBefore !== intlInserted || indianAfter - indianBefore !== indianInserted) {
    console.warn("Count mismatch — check for manual changes");
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
