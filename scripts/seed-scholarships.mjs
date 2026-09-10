/**
 * Phase 33 (P5) — Scholarship catalog seed (idempotent, additive only).
 *
 * Safety rules:
 *  - upsert by `slug` (name unique) — never deletes or overwrites unknown rows.
 *  - amounts are ALWAYS null in this seed: no invented figures.
 *  - deadlineDisplay only ever states variability, never a specific date.
 *  - every row carries an official source URL verified at seed-authoring time.
 *
 * Run:  node scripts/seed-scholarships.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROWS = [
  {
    slug: "aicte-pragati",
    name: "AICTE Pragati Scholarship for Girl Students",
    provider: "All India Council for Technical Education (AICTE) — Ministry of Education",
    providerType: "GOVERNMENT",
    country: "India",
    destinationCountries: ["India"],
    educationLevels: ["Undergraduate", "Diploma"],
    eligibleNationalities: ["India"],
    courseCategories: ["Engineering", "Technology", "Pharmacy", "Architecture", "Applied Sciences"],
    summary:
      "Financial support for girl students pursuing eligible technical programmes at AICTE-approved institutions in India.",
    coverage: ["Tuition"],
    amountSummary: null,
    eligibilitySummary:
      "For Indian-national girl students admitted to AICTE-approved institutions offering notified technical programmes. Schemes and seat availability change yearly — confirm the current guidelines on the official AICTE scholarship page.",
    applicationRoute: "NATIONAL_PORTAL",
    applicationUrl: "https://www.aicte-india.org/scholarships",
    applicationUrlVerified: true,
    deadlineDisplay: null,
    deadlineVerified: false,
    documentsRequired: ["Admission proof", "Identity and income documents as notified"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "AICTE Scholarship Schemes",
    sourceUrl: "https://www.aicte-india.org/scholarships",
  },
  {
    slug: "aicte-saksham",
    name: "AICTE Saksham Scholarship for Students with Disability",
    provider: "All India Council for Technical Education (AICTE) — Ministry of Education",
    providerType: "GOVERNMENT",
    country: "India",
    destinationCountries: ["India"],
    educationLevels: ["Undergraduate", "Diploma"],
    eligibleNationalities: ["India"],
    courseCategories: ["Engineering", "Technology", "Pharmacy", "Architecture", "Applied Sciences"],
    summary:
      "Financial support for students with disability pursuing eligible technical programmes at AICTE-approved institutions in India.",
    coverage: ["Tuition"],
    amountSummary: null,
    eligibilitySummary:
      "For Indian-national students with a disability admitted to AICTE-approved institutions offering notified technical programmes. Confirm the current guidelines and notified seats on the official AICTE scholarship page.",
    applicationRoute: "NATIONAL_PORTAL",
    applicationUrl: "https://www.aicte-india.org/scholarships",
    applicationUrlVerified: true,
    deadlineDisplay: null,
    deadlineVerified: false,
    documentsRequired: ["Admission proof", "Disability certificate and other documents as notified"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "AICTE Scholarship Schemes",
    sourceUrl: "https://www.aicte-india.org/scholarships",
  },
  {
    slug: "aicte-pg-gate",
    name: "AICTE PG Scholarship for GATE/GPAT Qualifying Students",
    provider: "All India Council for Technical Education (AICTE) — Ministry of Education",
    providerType: "GOVERNMENT",
    country: "India",
    destinationCountries: ["India"],
    educationLevels: ["Postgraduate"],
    eligibleNationalities: ["India"],
    courseCategories: ["Engineering", "Technology", "Pharmacy"],
    summary:
      "Maintenance support for students admitted to AICTE-approved postgraduate programmes after qualifying GATE/GPAT.",
    coverage: ["Maintenance allowance"],
    amountSummary: null,
    eligibilitySummary:
      "For Indian-national students admitted to notified AICTE-approved postgraduate technical programmes on the basis of a qualifying GATE/GPAT score. Rules change yearly — verify the current scheme on the official AICTE page.",
    applicationRoute: "NATIONAL_PORTAL",
    applicationUrl: "https://www.aicte-india.org/scholarships",
    applicationUrlVerified: true,
    deadlineDisplay: null,
    deadlineVerified: false,
    documentsRequired: ["Admission proof", "GATE/GPAT scorecard", "Other documents as notified"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "AICTE Scholarship Schemes",
    sourceUrl: "https://www.aicte-india.org/scholarships",
  },
  {
    slug: "central-sector-college-university",
    name: "Central Sector Scheme of Scholarship for College and University Students",
    provider: "Ministry of Education, Government of India",
    providerType: "GOVERNMENT",
    country: "India",
    destinationCountries: ["India"],
    educationLevels: ["Undergraduate"],
    eligibleNationalities: ["India"],
    courseCategories: [],
    summary:
      "Merit-based scholarship for first-year students from low-income families pursuing recognised degree or diploma courses in India.",
    coverage: ["Maintenance allowance", "Tuition"],
    amountSummary: null,
    eligibilitySummary:
      "For meritorious Indian students from households meeting the scheme's parental-income limit, admitted through a state admission authority or a recognised institution. Administered through the National Scholarship Portal — confirm the current-year rules there.",
    applicationRoute: "NATIONAL_PORTAL",
    applicationUrl: "https://scholarships.gov.in",
    applicationUrlVerified: true,
    deadlineDisplay: null,
    deadlineVerified: false,
    documentsRequired: ["Admission proof", "Bank and identity documents", "Income proof as notified"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "National Scholarship Portal (NSP)",
    sourceUrl: "https://scholarships.gov.in",
  },
  {
    slug: "nsp-post-matric-obc",
    name: "Post Matric Scholarship for Other Backward Classes",
    provider: "Ministry of Social Justice and Empowerment, Government of India",
    providerType: "GOVERNMENT",
    country: "India",
    destinationCountries: ["India"],
    educationLevels: ["Undergraduate", "Postgraduate"],
    eligibleNationalities: ["India"],
    courseCategories: [],
    summary:
      "Central-sector scholarship for OBC students studying post-matric and beyond in eligible institutions in India.",
    coverage: ["Maintenance allowance", "Tuition"],
    amountSummary: null,
    eligibilitySummary:
      "For Indian students belonging to OBC categories admitted to notified post-matric courses. Renewal and fresh-award rules change yearly — administer and verify through the National Scholarship Portal.",
    applicationRoute: "NATIONAL_PORTAL",
    applicationUrl: "https://scholarships.gov.in",
    applicationUrlVerified: true,
    deadlineDisplay: null,
    deadlineVerified: false,
    documentsRequired: ["Category certificate", "Admission proof", "Bank and identity documents as notified"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "National Scholarship Portal (NSP)",
    sourceUrl: "https://scholarships.gov.in",
  },
  {
    slug: "nsp-nmms",
    name: "National Means-cum-Merit Scholarship (NMMS)",
    provider: "Ministry of Education, Government of India",
    providerType: "GOVERNMENT",
    country: "India",
    destinationCountries: ["India"],
    educationLevels: ["Class 9", "Class 10", "Class 11", "Class 12"],
    eligibleNationalities: ["India"],
    courseCategories: [],
    summary:
      "Merit-cum-means scholarship for students in government and government-aided schools in India, awarded from Class IX onwards.",
    coverage: ["Maintenance allowance"],
    amountSummary: null,
    eligibilitySummary:
      "For Indian students studying in government or government-aided schools who are selected through the qualifying state-level examination process and meet the notified family-income criteria. Confirm the current scheme rules on the official portal.",
    applicationRoute: "NATIONAL_PORTAL",
    applicationUrl: "https://scholarships.gov.in",
    applicationUrlVerified: true,
    deadlineDisplay: null,
    deadlineVerified: false,
    documentsRequired: ["School admission proof", "Income and identity documents as notified"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "National Scholarship Portal (NSP)",
    sourceUrl: "https://scholarships.gov.in",
  },
  {
    slug: "chevening",
    name: "Chevening Scholarships",
    provider: "UK Foreign, Commonwealth & Development Office (FCDO)",
    providerType: "INTERNATIONAL_ORGANIZATION",
    country: "GLOBAL",
    destinationCountries: ["United Kingdom"],
    educationLevels: ["Postgraduate"],
    eligibleNationalities: [],
    courseCategories: [],
    summary:
      "Fully-funded master's scholarships for outstanding emerging leaders from Chevening-eligible countries to study at UK universities.",
    coverage: ["Tuition", "Living costs", "Travel"],
    amountSummary: null,
    eligibilitySummary:
      "Open to citizens of Chevening-eligible countries with a strong academic record, work experience and leadership potential. Selection is competitive — check the official eligibility criteria and current cycle on chevening.org.",
    applicationRoute: "PROVIDER_SITE",
    applicationUrl: "https://www.chevening.org",
    applicationUrlVerified: true,
    deadlineDisplay:
      "Applications open annually — confirm the current cycle dates on the official website.",
    deadlineVerified: false,
    documentsRequired: ["Academic transcripts", "References", "UK university offers as required"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "Chevening (UK FCDO)",
    sourceUrl: "https://www.chevening.org",
  },
  {
    slug: "commonwealth",
    name: "Commonwealth Scholarships",
    provider: "Commonwealth Scholarship Commission (CSC), United Kingdom",
    providerType: "INTERNATIONAL_ORGANIZATION",
    country: "GLOBAL",
    destinationCountries: ["United Kingdom"],
    educationLevels: ["Postgraduate"],
    eligibleNationalities: [],
    courseCategories: [],
    summary:
      "Scholarships for citizens of eligible Commonwealth countries to pursue master's or doctoral study in the United Kingdom.",
    coverage: ["Tuition", "Living costs", "Travel"],
    amountSummary: null,
    eligibilitySummary:
      "For citizens of eligible Commonwealth countries with the required academic record. Programmes, quotas and nomination routes vary by country — confirm your eligibility on the official CSC website.",
    applicationRoute: "PROVIDER_SITE",
    applicationUrl: "https://cscuk.fcdo.gov.uk",
    applicationUrlVerified: true,
    deadlineDisplay:
      "Application windows are announced annually — confirm on the official CSC website.",
    deadlineVerified: false,
    documentsRequired: ["Academic transcripts", "References", "Acceptance from a UK university as required"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "Commonwealth Scholarship Commission (CSC UK)",
    sourceUrl: "https://cscuk.fcdo.gov.uk",
  },
  {
    slug: "daad-study-scholarships",
    name: "DAAD Study Scholarships",
    provider: "German Academic Exchange Service (DAAD)",
    providerType: "INTERNATIONAL_ORGANIZATION",
    country: "GLOBAL",
    destinationCountries: ["Germany"],
    educationLevels: ["Postgraduate"],
    eligibleNationalities: [],
    courseCategories: [],
    summary:
      "German government-funded scholarships for international graduates pursuing postgraduate study at German universities.",
    coverage: ["Living costs", "Tuition"],
    amountSummary: null,
    eligibilitySummary:
      "Open to international graduates depending on the specific DAAD programme, nationality and field. Coverage and conditions vary by programme — verify the relevant programme on the official DAAD scholarship database.",
    applicationRoute: "PROVIDER_SITE",
    applicationUrl: "https://www.daad.de",
    applicationUrlVerified: true,
    deadlineDisplay:
      "DAAD programmes open at different points in the year — confirm the current deadline for your programme on the DAAD database.",
    deadlineVerified: false,
    documentsRequired: ["Academic transcripts", "Language certificates", "Supervisor/institution documents as required"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "German Academic Exchange Service (DAAD)",
    sourceUrl: "https://www.daad.de",
  },
  {
    slug: "erasmus-mundus",
    name: "Erasmus Mundus Joint Masters Scholarships",
    provider: "European Union (Erasmus+)",
    providerType: "INTERNATIONAL_ORGANIZATION",
    country: "GLOBAL",
    destinationCountries: ["European Union"],
    educationLevels: ["Postgraduate"],
    eligibleNationalities: [],
    courseCategories: [],
    summary:
      "Scholarships for selected students on joint master's programmes run by consortia of European universities.",
    coverage: ["Tuition", "Living costs", "Travel"],
    amountSummary: null,
    eligibilitySummary:
      "Awarded competitively to students admitted to the applying co-funded joint master's programmes. Eligibility and scholarship scope vary by consortium and by your country — verify the specific programme page on the official Erasmus+ site.",
    applicationRoute: "PROVIDER_SITE",
    applicationUrl: "https://erasmus-plus.ec.europa.eu",
    applicationUrlVerified: true,
    deadlineDisplay:
      "Each consortium announces its own application window — confirm the current cycle on the programme's official page.",
    deadlineVerified: false,
    documentsRequired: ["Academic transcripts", "Motivation and references", "Other documents as required by the consortium"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "Erasmus+ (European Commission)",
    sourceUrl: "https://erasmus-plus.ec.europa.eu",
  },
  {
    slug: "fulbright-foreign-student",
    name: "Fulbright Foreign Student Program",
    provider: "U.S. Department of State / Fulbright Foreign Scholarship Board",
    providerType: "INTERNATIONAL_ORGANIZATION",
    country: "GLOBAL",
    destinationCountries: ["United States"],
    educationLevels: ["Postgraduate"],
    eligibleNationalities: [],
    courseCategories: [],
    summary:
      "Grants for international graduate students to pursue degree study at U.S. universities.",
    coverage: ["Tuition", "Living costs"],
    amountSummary: null,
    eligibilitySummary:
      "Open to citizens of participating countries depending on their home country's Fulbright commission or U.S. embassy announcements. Requirements vary by country and year — verify the program detail for your country on the official Fulbright site.",
    applicationRoute: "PROVIDER_SITE",
    applicationUrl: "https://us.fulbrightonline.org",
    applicationUrlVerified: true,
    deadlineDisplay:
      "Application timelines differ by country — confirm with your country's Fulbright commission or the official program pages.",
    deadlineVerified: false,
    documentsRequired: ["Academic transcripts", "Test scores as required", "References and statement as required"],
    verificationState: "PARTIALLY_VERIFIED",
    sourceName: "Fulbright Foreign Student Program",
    sourceUrl: "https://us.fulbrightonline.org",
  },
];

async function main() {
  let upserted = 0;
  for (const row of ROWS) {
    const existing = await prisma.scholarship.findUnique({ where: { slug: row.slug } });
    if (existing) {
      // Refresh only presentation-safe fields; NEVER touch amount/deadline if the
      // catalog was later enriched with verified data.
      await prisma.scholarship.update({
        where: { slug: row.slug },
        data: {
          name: row.name,
          isActive: true,
          summary: row.summary,
          eligibilitySummary: row.eligibilitySummary,
        },
      });
    } else {
      await prisma.scholarship.create({ data: row });
      upserted += 1;
    }
  }
  console.log(`scholarships: ${ROWS.length} known, ${upserted} created (rest already present)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });