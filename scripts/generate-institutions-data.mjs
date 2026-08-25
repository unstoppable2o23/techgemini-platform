import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const AISHE_DIR = path.join(process.cwd(), "AISHE");
const OUT_FILE = path.join(process.cwd(), "scripts", "institutions-data.json");

function readRows(file) {
  const wb = XLSX.readFile(file);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  return rows.filter((r) => r.length > 1 && String(r[0]).trim() !== "");
}

function str(v) {
  if (v === undefined || v === null) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

const records = [];
const seen = new Set();

function push(row) {
  const aisheCode = str(row.aisheCode);
  if (!aisheCode || seen.has(aisheCode)) return;
  seen.add(aisheCode);
  records.push({
    aisheCode,
    name: str(row.name),
    type: row.type,
    state: str(row.state),
    district: str(row.district) || null,
    website: str(row.website) || null,
    yearOfEstablishment: str(row.yearOfEstablishment) || null,
    location: str(row.location) || null,
    institutionType: str(row.institutionType) || null,
    management: str(row.management) || null,
    universityAisheCode: str(row.universityAisheCode) || null,
    universityName: str(row.universityName) || null,
  });
}

function mapHeader(name) {
  const n = String(name || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const map = {
    aishecode: "aisheCode",
    name: "name",
    institutename: "name",
    state: "state",
    statename: "state",
    district: "district",
    districtname: "district",
    website: "website",
    yearofestablishment: "yearOfEstablishment",
    location: "location",
    collegetype: "institutionType",
    standalone: "institutionType",
    standalonetype: "institutionType",
    manegement: "management",
    management: "management",
    managementtype: "management",
    universityaishecode: "universityAisheCode",
    universityname: "universityName",
    administrativeministry: "institutionType",
  };
  return map[n] || n;
}

function loadFile(file, type) {
  const rows = readRows(file);
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const vals = rows[i].map((v) => String(v || "").trim());
    if (vals.some((v) => /aishe/i.test(v))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    console.warn("Skipping (no AISHE header):", path.basename(file));
    return;
  }
  const headers = rows[headerIdx].map((h) => mapHeader(h));
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const vals = rows[i];
    const row = {};
    headers.forEach((h, ci) => {
      if (h) row[h] = vals[ci];
    });
    row.type = type;
    push(row);
  }
  console.log("Loaded", path.basename(file), "-", rows.length - headerIdx - 1, "rows");
}

if (!fs.existsSync(AISHE_DIR)) {
  console.error("AISHE folder not found:", AISHE_DIR);
  process.exit(1);
}

loadFile(path.join(AISHE_DIR, "University-ALL UNIVERSITIES.xlsx"), "University");
loadFile(path.join(AISHE_DIR, "College-ALL COLLEGE.xlsx"), "College");
loadFile(path.join(AISHE_DIR, "Standalone-ALL STANDALONE.xlsx"), "Standalone");
loadFile(path.join(AISHE_DIR, "R & D Institutes.xlsx"), "R&D Institute");

const iniDir = path.join(AISHE_DIR, "Institute of National Importance");
if (fs.existsSync(iniDir)) {
  for (const f of fs.readdirSync(iniDir)) {
    if (f.endsWith(".xlsx")) loadFile(path.join(iniDir, f), "University");
  }
}

fs.writeFileSync(OUT_FILE, JSON.stringify(records));
console.log("\nWrote", records.length, "institutions to", OUT_FILE);
