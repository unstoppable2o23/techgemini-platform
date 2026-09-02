import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "scripts", "phase17-data");
const mapsDir = path.join(dataDir, "mappings");

const catalogue = JSON.parse(fs.readFileSync(path.join(dataDir, "academic-programs.json"), "utf8"));
const slugSet = new Set(catalogue.programs.map((p) => p.slug));

const careers = JSON.parse(
  fs.readFileSync("C:/Users/Uni/AppData/Local/Temp/opencode/phase17-careers-duck.json", "utf8")
);
const careerNames = new Set(careers.map((c) => c.name));

const merged = {};
const files = fs.readdirSync(mapsDir).filter((f) => f.endsWith(".json"));
for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(mapsDir, f), "utf8"));
  for (const [career, arr] of Object.entries(data)) {
    if (merged[career]) {
      console.error(`DUPLICATE career key: ${career} (file ${f})`);
      process.exitCode = 1;
    }
    merged[career] = arr;
  }
}

const errors = [];
const unknownSlugs = new Set();
const badTypes = new Set();
const validTypes = new Set(["PRIMARY", "COMMON", "SPECIALIZED", "RELEVANT", "OPTIONAL"]);

for (const [career, arr] of Object.entries(merged)) {
  if (!careerNames.has(career)) {
    errors.push(`Mapping key '${career}' does not match any active career name`);
  }
  const seen = new Set();
  for (const m of arr) {
    if (!slugSet.has(m.program)) unknownSlugs.add(m.program);
    if (!validTypes.has(m.relationshipType)) badTypes.add(m.relationshipType);
    if (seen.has(m.program)) errors.push(`Career '${career}' has duplicate program '${m.program}'`);
    seen.add(m.program);
  }
}

const missingCareers = [...careerNames].filter((n) => !merged[n]);

console.log(`Catalogue programs: ${slugSet.size}`);
console.log(`Mapped careers in files: ${Object.keys(merged).length}`);
console.log(`Mapping total entries: ${Object.values(merged).reduce((a, r) => a + r.length, 0)}`);
console.log(`Files: ${files.join(", ")}`);
if (unknownSlugs.size) console.log(`UNKNOWN SLUGS: ${[...unknownSlugs].join(", ")}`);
if (badTypes.size) console.log(`BAD TYPES: ${[...badTypes].join(", ")}`);
if (missingCareers.length) console.log(`CAREERS WITHOUT MAPPING (${missingCareers.length}): ${missingCareers.join("; ")}`);
if (errors.length) {
  console.error("ERRORS:");
  errors.forEach((e) => console.error(" - " + e));
  process.exitCode = 1;
} else {
  console.log("No structural errors.");
}