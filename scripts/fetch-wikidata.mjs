import fs from "fs";
import path from "path";

const OUT_FILE = path.join(process.cwd(), "scripts", "wikidata-institutions.json");

const QUERY = `
SELECT ?university ?universityLabel ?website ?stateLabel WHERE {
  ?university wdt:P31/wdt:P279* wd:Q3918.
  ?university wdt:P17 wd:Q668.
  OPTIONAL { ?university wdt:P856 ?website. }
  OPTIONAL { ?university wdt:P131 ?state. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
}`;

function norm(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

const url = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(QUERY);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

const response = await fetch(url, {
  headers: {
    Accept: "application/sparql-results+json",
    "User-Agent": "StudentCareerPlatform/1.0 (https://unstoppable2o23-old-techgemini.vercel.app)",
  },
  signal: controller.signal,
});
clearTimeout(timeout);

if (!response.ok) {
  console.error("Wikidata query failed:", response.status, response.statusText);
  process.exit(1);
}

const data = await response.json();
const seen = new Set();
const records = [];

for (const binding of data.results?.bindings || []) {
  const entity = binding.university?.value || "";
  const wdId = entity.replace(/^.*\/Q(\d+)$/, "Q$1");
  const name = (binding.universityLabel?.value || "").trim();
  if (!name) continue;
  const key = norm(name);
  if (seen.has(key)) continue;
  seen.add(key);
  records.push({
    wdId,
    name,
    website: (binding.website?.value || "").trim() || null,
    state: (binding.stateLabel?.value || "").trim() || null,
  });
}

fs.writeFileSync(OUT_FILE, JSON.stringify(records, null, 1));
console.log("Wrote", records.length, "records to", OUT_FILE);