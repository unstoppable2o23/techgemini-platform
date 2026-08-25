const XLSX = require("xlsx");
const path = require("path");

const headers = [
  "Name",
  "Country",
  "State",
  "City",
  "Type",
  "AcceptanceRate",
  "AvgGPA",
  "AvgSAT",
  "AvgACT",
  "TuitionInState",
  "TuitionOutOfState",
  "ApplicationFee",
  "Website",
  "Description",
];

const sampleData = [
  {
    Name: "Harvard University",
    Country: "United States",
    State: "Massachusetts",
    City: "Cambridge",
    Type: "Private",
    AcceptanceRate: 4,
    AvgGPA: 4.0,
    AvgSAT: 1520,
    AvgACT: 34,
    TuitionInState: 54269,
    TuitionOutOfState: 54269,
    ApplicationFee: 75,
    Website: "https://www.harvard.edu",
    Description: "Private Ivy League research university founded in 1636.",
  },
  {
    Name: "Stanford University",
    Country: "United States",
    State: "California",
    City: "Stanford",
    Type: "Private",
    AcceptanceRate: 4,
    AvgGPA: 3.95,
    AvgSAT: 1500,
    AvgACT: 33,
    TuitionInState: 56169,
    TuitionOutOfState: 56169,
    ApplicationFee: 90,
    Website: "https://www.stanford.edu",
    Description: "Private research university in Silicon Valley.",
  },
  {
    Name: "University of California, Berkeley",
    Country: "United States",
    State: "California",
    City: "Berkeley",
    Type: "Public",
    AcceptanceRate: 11,
    AvgGPA: 3.86,
    AvgSAT: 1410,
    AvgACT: 31,
    TuitionInState: 14428,
    TuitionOutOfState: 44336,
    ApplicationFee: 80,
    Website: "https://www.berkeley.edu",
    Description: "Public land-grant research university, flagship of UC system.",
  },
  {
    Name: "University of Oxford",
    Country: "United Kingdom",
    State: "",
    City: "Oxford",
    Type: "Public",
    AcceptanceRate: 17,
    AvgGPA: 3.8,
    AvgSAT: 0,
    AvgACT: 0,
    TuitionInState: 9250,
    TuitionOutOfState: 38950,
    ApplicationFee: 75,
    Website: "https://www.ox.ac.uk",
    Description: "Collegiate research university, oldest in English-speaking world.",
  },
  {
    Name: "University of Toronto",
    Country: "Canada",
    State: "Ontario",
    City: "Toronto",
    Type: "Public",
    AcceptanceRate: 43,
    AvgGPA: 3.6,
    AvgSAT: 0,
    AvgACT: 0,
    TuitionInState: 6100,
    TuitionOutOfState: 41100,
    ApplicationFee: 120,
    Website: "https://www.utoronto.ca",
    Description: "Public research university, largest in Canada.",
  },
];

const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });

// Set column widths for readability
ws["!cols"] = headers.map((h) => {
  const maxLen = Math.max(
    h.length,
    ...sampleData.map((row) => String(row[h] || "").length)
  );
  return { wch: Math.min(maxLen + 3, 40) };
});

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Universities");

const outputPath = path.join(__dirname, "..", "university-upload-template.xlsx");
XLSX.writeFile(wb, outputPath);

console.log(`Demo Excel file created: ${outputPath}`);
console.log("Headers:", headers.join(", "));
