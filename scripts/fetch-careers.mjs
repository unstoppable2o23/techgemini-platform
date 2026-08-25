import fs from "fs";
import path from "path";

const BASE = "https://careermilestone.edumilestones.com/global-career-library/backend.php";

const CAREERS = [
  "Data Science", "Software Engineering", "Product Management", "Digital Marketing",
  "User Experience Design UX", "Civil Services", "Investment Banking", "Medicine",
  "Law", "Architecture", "Aviation", "Culinary Arts", "Psychology", "Cyber Security",
  "Artificial Intelligence", "Blockchain Technology", "Cloud Computing",
  "Robotics Engineering", "Sustainability", "Drone Technology", "Ethical Hacking",
  "Full Stack Development", "DevOps", "Game Development", "Bioinformatics",
  "Content Creation", "Social Media Management", "Financial Analysis",
  "Interior Design", "Event Management", "Fashion Design", "Journalism",
  "Veterinary Science", "Nutrition and Dietetics", "Sports Management",
  "Supply Chain Management", "Human Resource Management", "Sales Management",
  "Actuarial Science", "Renewable Energy Engineering", "Internet of Things",
  "Mobile Application Development", "Software Testing and Quality Assurance",
  "Hardware and Networking", "Information Technology Business Analysis",
  "User Interface Design", "Graphic Design", "Product Design", "Industrial Design",
  "Visual Merchandising", "Animation", "Multimedia and Gaming", "Photography",
  "Sound Engineering", "Image Consulting", "Fine Arts", "Performing Arts",
  "Public Relations", "Advertising", "Corporate Communication", "Creative Writing",
  "Interpretation and Translation", "Business Management", "Entrepreneurship",
  "Strategy Consulting", "Project Management", "Operations Management",
  "Retail Management", "Growth Marketing", "Performance Marketing",
  "Brand Management", "Chartered Accountancy", "Cost and Management Accounting",
  "Company Secretaryship", "Financial Planning", "Risk Management", "Economics",
  "Biotechnology Research", "Clinical Research", "Biomedical Engineering",
  "Pharmacology", "Genetics", "Environmental Science", "Nanotechnology",
  "Dentistry", "Physiotherapy", "Sports Physiotherapy", "Optometry", "Audiology",
  "Medical Laboratory Sciences", "Radiology Technology", "Nursing",
  "Occupational Therapy", "Mechanical Engineering", "Civil Engineering",
  "Electrical Engineering", "Electronics Engineering", "Aerospace Engineering",
  "Chemical Engineering", "Industrial Quality Engineering", "Urban Planning",
  "Construction Management", "Landscape Design", "Climate Science",
  "Agricultural Engineering", "Agri Business Management", "Food Technology",
  "Dairy Technology", "Forestry", "Wildlife Biology", "Air Traffic Management",
  "Cabin Services", "Maritime Studies", "Logistics and Transportation Management",
  "Hotel Management", "Travel and Tourism Management", "Sports Coaching",
  "Professional Sports", "Physical Training", "School Education",
  "Higher Education and Academia", "Corporate Training", "Education Administration",
  "Library Sciences", "Career Counselling", "Mentoring and Coaching",
  "Forensic Science", "Law Enforcement Studies", "Disaster Management",
  "Defence Services", "Economic Services", "Staff Selection Services",
  "Investment Advisory", "Sustainability Analytics", "Health Informatics",
  "Agriculture Research", "Pilot", "Airforce",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchCareer(name) {
  const body = new URLSearchParams();
  body.append("vars[careerName]", name);
  body.append("vars[country]", "India");
  body.append("vars[language]", "English");

  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  const json = JSON.parse(text);
  if (json.isValid === false) {
    console.error(`SKIP ${name}: ${json.errorReason}`);
    return null;
  }
  return { name, ...json.careerData };
}

const results = [];
const failures = [];
for (const name of CAREERS) {
  try {
    const data = await fetchCareer(name);
    if (data) results.push(data);
    console.log(`OK ${name} (${results.length}/${CAREERS.length})`);
  } catch (e) {
    failures.push(name);
    console.error(`FAIL ${name}: ${e.message}`);
  }
  await sleep(150);
}

const outPath = path.resolve(process.cwd(), "scripts", "careers-data.json");
fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
console.log(`\nSaved ${results.length} careers to ${outPath}`);
if (failures.length) console.log("Failures:", failures.join(", "));
