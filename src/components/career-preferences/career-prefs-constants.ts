export const CAREER_OPTIONS = [
  "Art & Design",
  "Architecture",
  "Science",
  "Business Management",
  "Computer Science & Information Technology",
  "Education & Teaching",
  "Engineering & Technology",
  "Healthcare",
  "Hospitality, Tourism & Events",
  "Humanities",
  "Journalism, Media, PR & Communication",
  "Law",
  "Medicine",
  "Bio Sciences & Biotechnology",
  "Computer Graphics & Animation",
  "Economics & Commerce",
  "Fashion",
  "Linguistics",
  "Mathematics & Statistics",
  "Music & Dance",
  "Psychology",
  "Sports",
  "Defence",
  "Public Administration & Government",
  "Others",
];

export const EDUCATION_OPTIONS = [
  "Grade 12 / High School",
  "Post-Secondary Certificate",
  "Undergraduate Diploma",
  "Undergraduate Advanced Diploma",
  "3-Year Bachelor's Degree",
  "4-Year Bachelor's Degree",
  "Postgraduate Certificate / Diploma",
  "Master's Degree",
  "Doctoral Degree (Ph.D., M.D., ...)",
];

export const BUDGET_OPTIONS = [
  "Under $10,000 USD",
  "$10,000 – $20,000 USD",
  "$20,000 – $30,000 USD",
  "Over $30,000 USD",
];

export const FUNDING_OPTIONS = [
  "Personal savings or Parents",
  "I have a loan or scholarship",
  "I don't have funds, I'm looking for scholarships",
];

export const PROFICIENCY_OPTIONS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Native / Fluent",
];

export const INTAKE_OPTIONS = [
  "FALL",
  "WINTER",
  "SPRING / SUMMER",
];

export const START_YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030", "2031", "2032"];

export const SESSION_OPTIONS = [
  "Fall 2026",
  "Spring 2027",
  "Fall 2027",
  "Spring 2028",
  "Fall 2028",
  "Spring 2029",
];

export type ExamDef = {
  label: string;
  name: string;
  min: number;
  max: number;
  step: number;
  hint: string;
};

export const ENGLISH_TEST_OPTIONS: ExamDef[] = [
  { label: "IELTS", name: "IELTS", min: 0, max: 9, step: 0.5, hint: "Overall band score (0 – 9)" },
  { label: "TOEFL iBT", name: "TOEFL iBT", min: 0, max: 120, step: 1, hint: "Total score (0 – 120)" },
  { label: "PTE Academic", name: "PTE Academic", min: 10, max: 90, step: 1, hint: "Overall score (10 – 90)" },
  { label: "Duolingo English Test", name: "Duolingo English Test", min: 10, max: 160, step: 1, hint: "Overall score (10 – 160)" },
  { label: "Cambridge C1 Advanced (CAE)", name: "Cambridge C1 Advanced (CAE)", min: 160, max: 210, step: 1, hint: "Cambridge English Scale (160 – 210)" },
  { label: "CELPIP General", name: "CELPIP General", min: 1, max: 12, step: 1, hint: "CLB level (1 – 12)" },
  { label: "Other", name: "Other", min: 0, max: 1000, step: 1, hint: "Enter your overall score" },
];

export const NATIONALITY_OPTIONS = [
  "Indian", "American", "British", "Australian", "Canadian", "German", "French",
  "Singaporean", "New Zealander", "Irish", "Dutch", "Swiss", "Swedish", "Italian",
  "Spanish", "Japanese", "Chinese", "South Korean", "Emirati", "Saudi Arabian",
  "Qatari", "Kuwaiti", "Omani", "Bahraini", "Bangladeshi", "Sri Lankan", "Nepali",
  "Pakistani", "Burmese", "Thai", "Vietnamese", "Malaysian", "Indonesian",
  "Filipino", "Nigerian", "Kenyan", "Ethiopian", "Egyptian", "South African",
  "Brazilian", "Mexican", "Russian", "Turkish", "Ukrainian", "Polish", "Other",
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi (NCT)", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const FLAG_CODES: Record<string, string> = {
  "USA": "🇺🇸",
  "UK": "🇬🇧",
  "Canada": "🇨🇦",
  "Australia": "🇦🇺",
  "Germany": "🇩🇪",
  "France": "🇫🇷",
  "India": "🇮🇳",
  "Singapore": "🇸🇬",
  "New Zealand": "🇳🇿",
  "Ireland": "🇮🇪",
  "Netherlands": "🇳🇱",
  "Switzerland": "🇨🇭",
  "Sweden": "🇸🇪",
  "Italy": "🇮🇹",
  "Spain": "🇪🇸",
  "Japan": "🇯🇵",
  "China": "🇨🇳",
  "South Korea": "🇰🇷",
  "UAE": "🇦🇪",
  "Saudi Arabia": "🇸🇦",
  "Qatar": "🇶🇦",
  "Kuwait": "🇰🇼",
  "Oman": "🇴🇲",
  "Bahrain": "🇧🇭",
  "Brazil": "🇧🇷",
  "Mexico": "🇲🇽",
  "Russia": "🇷🇺",
  "Turkey": "🇹🇷",
  "Egypt": "🇪🇬",
  "South Africa": "🇿🇦",
  "Kenya": "🇰🇪",
  "Nigeria": "🇳🇬",
  "Ethiopia": "🇪🇹",
  "Malaysia": "🇲🇾",
  "Indonesia": "🇮🇩",
  "Thailand": "🇹🇭",
  "Vietnam": "🇻🇳",
  "Philippines": "🇵🇭",
  "Bangladesh": "🇧🇩",
  "Pakistan": "🇵🇰",
  "Nepal": "🇳🇵",
  "Sri Lanka": "🇱🇰",
  "Burma": "🇲🇲",
  "Poland": "🇵🇱",
  "Ukraine": "🇺🇦",
};

export const COUNTRY_OPTIONS = Object.keys(FLAG_CODES).concat(["Other"]);

export function flagFor(country: string): string {
  return FLAG_CODES[country] || FLAG_CODES[country.replace(" / ", "/")] || "🌍";
}

export const SUBJECT_OPTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Statistics",
  "Economics",
  "Accountancy",
  "Business Studies",
  "English",
  "History",
  "Geography",
  "Psychology",
  "Political Science",
  "Sociology",
  "Art & Design",
  "Languages",
  "Other",
];

export const ACTIVITY_OPTIONS = [
  "Coding / Technology",
  "Solving problems",
  "Working with numbers",
  "Research",
  "Designing",
  "Writing",
  "Communication",
  "Teaching",
  "Helping people",
  "Business / Entrepreneurship",
  "Working with machines",
  "Building / Making things",
  "Working outdoors",
  "Working with data",
  "Creating content",
  "Working with animals",
  "Science / Experiments",
  "Leadership",
  "Planning / Organizing",
];

export const EXAM_OPTIONS = [
  "SAT",
  "ACT",
  "JEE Main",
  "JEE Advanced",
  "NEET",
  "AP (Advanced Placement)",
  "A-Levels",
  "IB (International Baccalaureate)",
  "CUET",
  "TOEFL",
  "IELTS",
  "PTE",
  "GRE",
  "GMAT",
  "Other",
];

export const STUDY_LEVEL_OPTIONS = [
  "Secondary School (Grades 9-10)",
  "Senior Secondary (Grades 11-12)",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctoral Degree",
  "Other",
];

export const GRADE_LEVEL_OPTIONS = [
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Graduate",
];
