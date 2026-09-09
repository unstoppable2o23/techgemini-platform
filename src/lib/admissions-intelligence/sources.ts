/**
 * Phase 31 — Official admission-source registry.
 *
 * Only OFFICIAL bodies with official domains are listed. Entries describe a
 * body's *stable* admissions-relevant role — they never hardcode current-year
 * application windows, deadlines, cutoffs or eligibility. Keeping the source
 * list separate from the guidance builders means guidance can attach the same
 * verified source object everywhere (Decision Center, Decision Pack, Student
 * 360, student page) without duplicating or drifting.
 */
import type { OfficialSource } from "./types.ts";

export const OFFICIAL_SOURCES: OfficialSource[] = [
  {
    id: "nta",
    name: "National Testing Agency (NTA)",
    domain: "nta.ac.in",
    canonicalUrl: "https://www.nta.ac.in",
    purpose:
      "Conducts notified national-level entrance examinations (for example NEET-UG, JEE Main, CUET-UG). Check the NTA's notified exam pages for the procedures that apply.",
    sourceType: "EXAM_AUTHORITY",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "josaa",
    name: "Joint Seat Allocation Authority (JoSAA)",
    domain: "josaa.nic.in",
    canonicalUrl: "https://josaa.nic.in",
    purpose:
      "Joint seat allocation for participating engineering institutions. Participation varies by institution — confirm the notified admission and counselling routes.",
    sourceType: "COUNSELLING_AUTHORITY",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "mcc",
    name: "Medical Counselling Committee (MCC)",
    domain: "mcc.nic.in",
    canonicalUrl: "https://mcc.nic.in",
    purpose:
      "Centralized counselling for the All-India quota in notified undergraduate medical/dental admissions. State quotas follow the respective state counselling authorities — confirm which applies to your domicile.",
    sourceType: "COUNSELLING_AUTHORITY",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "nmc",
    name: "National Medical Commission (NMC)",
    domain: "nmc.org.in",
    canonicalUrl: "https://www.nmc.org.in",
    purpose:
      "Regulator for undergraduate and postgraduate medical education (MBBS). Consult for notified admission-regulations and eligibility criteria.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "dci",
    name: "Dental Council of India (DCI)",
    domain: "dciindia.gov.in",
    canonicalUrl: "https://dciindia.gov.in",
    purpose:
      "Regulator for dental education (BDS). Consult for notified admission regulations and eligibility.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "pci",
    name: "Pharmacy Council of India (PCI)",
    domain: "pci.nic.in",
    canonicalUrl: "https://www.pci.nic.in",
    purpose:
      "Regulator for pharmacy education. Consult for the notified admission routes (D.Pharm / B.Pharm / Pharm.D) and eligibility criteria.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "inc",
    name: "Indian Nursing Council (INC)",
    domain: "indiannursingcouncil.org",
    canonicalUrl: "https://www.indiannursingcouncil.org",
    purpose:
      "Regulator for nursing education (GNM / B.Sc Nursing). Consult for the notified admission routes and eligibility criteria.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "ncahp",
    name: "National Commission for Allied and Healthcare Professions (NCAHP)",
    domain: "ahpnec.gov.in",
    canonicalUrl: "https://www.ahpnec.gov.in",
    purpose:
      "Regulator for allied and healthcare professionals (including physiotherapy and other allied courses). Consult for notified rules that apply to the specific course.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "ncism",
    name: "National Commission for Indian System of Medicine (NCISM)",
    domain: "ncismindia.org",
    canonicalUrl: "https://ncismindia.org",
    purpose:
      "Regulator for Indian-System-of-Medicine education (AYUSH courses such as BAMS). Consult for the notified admission routes and eligibility.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "nch",
    name: "National Commission for Homoeopathy (NCH)",
    domain: "nch.org.in",
    canonicalUrl: "https://nch.org.in",
    purpose:
      "Regulator for homoeopathy education (BHMS). Consult for the notified admission routes and eligibility.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "vci",
    name: "Veterinary Council of India (VCI)",
    domain: "vci.nic.in",
    canonicalUrl: "https://vci.nic.in",
    purpose:
      "Regulator for veterinary education. Consult for the notified admission routes and eligibility.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "icar",
    name: "Indian Council of Agricultural Research (ICAR)",
    domain: "icar.org.in",
    canonicalUrl: "https://icar.org.in",
    purpose:
      "Involved in higher agricultural education. Consult for the notified entrance and counselling routes applicable to agricultural courses.",
    sourceType: "GOVERNMENT",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "ugc",
    name: "University Grants Commission (UGC)",
    domain: "ugc.gov.in",
    canonicalUrl: "https://www.ugc.gov.in",
    purpose:
      "Higher-education regulator that sets broad degree framework regulations. Admission specifics remain per-institution — always confirm with the institution's official admissions page.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "aicte",
    name: "All India Council for Technical Education (AICTE)",
    domain: "aicte-india.org",
    canonicalUrl: "https://www.aicte-india.org",
    purpose:
      "Regulator for technical education programs and institutions. Consult for notified program/approval context; admission routes remain per-institution.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "clat-consortium",
    name: "CLAT Consortium",
    domain: "consortiumofnlus.ac.in",
    canonicalUrl: "https://consortiumofnlus.ac.in",
    purpose:
      "Conducts the Common Law Admission Test used by participating National Law Universities. Participation varies — confirm which institutions and exams apply.",
    sourceType: "EXAM_AUTHORITY",
    jurisdiction: "National (India)",
    active: true,
  },
  {
    id: "jee-advanced",
    name: "JEE (Advanced)",
    domain: "jeeadv.ac.in",
    canonicalUrl: "https://jeeadv.ac.in",
    purpose:
      "Official portal for the JEE (Advanced) examination administered by an IIT zonal chair for admission to participating institutions. Confirm which institutions accept it.",
    sourceType: "EXAM_AUTHORITY",
    jurisdiction: "National (India)",
    active: true,
  },
];

const BY_ID = new Map(OFFICIAL_SOURCES.map((s) => [s.id, s]));
const BY_DOMAIN = new Map(OFFICIAL_SOURCES.map((s) => [s.domain, s]));

export function getOfficialSource(id: string): OfficialSource | null {
  return BY_ID.get(id) ?? null;
}

export function getOfficialSourceByDomain(domain: string): OfficialSource | null {
  return BY_DOMAIN.get(domain) ?? null;
}

/** Normalize a URL to its bare domain for registry lookups. */
export function domainOf(url: string): string {
  const clean = url.replace(/^https?:\/\//, "").split("/")[0] ?? "";
  return clean.replace(/^www\./, "");
}

/** True when `url` is an official, active registry source (or official subdomain). */
export function isOfficialSourceUrl(url: string): boolean {
  const d = domainOf(url);
  if (d.endsWith(".nta.nic.in") || d === "nta.nic.in") return true;
  return OFFICIAL_SOURCES.some(
    (s) => d === s.domain || d.endsWith("." + s.domain)
  );
}

/**
 * Resolve an evidence source (from the medical education registry) into a full
 * registry entry. Unknown-but-cited official domains fall back to a
 * conservative generic entry rather than being dropped or invented as facts.
 */
export function resolveCitedSource(input: {
  name: string;
  url: string;
}): OfficialSource {
  const d = domainOf(input.url);
  const known = getOfficialSourceByDomain(d);
  if (known) return known;
  return {
    id: `cited-${d.replace(/[^a-z0-9]/g, "-")}`,
    name: input.name,
    domain: d,
    canonicalUrl: input.url,
    purpose:
      "Official entry/regulatory body cited for this pathway in the medical education registry. Consult it directly to confirm the notified process.",
    sourceType: "REGULATOR",
    jurisdiction: "National (India)",
    active: true,
  };
}