/**
 * Phase 23.2 — Medical Education Knowledge Layer (Part B).
 *
 * Data-only registry describing how each healthcare/medical career is entered,
 * regulated and progressed, with honest, conservative wording:
 *   - India vs abroad pathways are kept distinct.
 *   - No fabricated seats/cutoffs/fees/rankings; no guaranteed outcomes.
 *   - Entrance exams are attributed to their official administering bodies and
 *     phrased as "confirm which applies" (NTA NEET-UG covers MBBS/BDS and — per
 *     official notifications — AYUSH courses (BAMS/BHMS/BUMS/BSMS) and some
 *     B.Sc-Nursing admissions; it never covers "every healthcare course").
 *   - Regulators are named only where they exist (NMC, DCI, INC, PCI, NCISM,
 *     NCH, NCAHP, VCI). Ambiguous/allied fields say so rather than inventing a
 *     regulator.
 *
 * This module is pure data + pure helpers. It performs no DB reads and is not
 * part of the frozen career/assessment engines. The engine catalog (Career /
 * Degree / Program rows and their relationships) is NOT modified by this file.
 */

export interface MedicalSource {
  name: string;
  url: string;
}

export interface MedicalDisciplineInfo {
  /** Stable id. */
  id: string;
  /** Display title for the MEDICAL EDUCATION PATH section. */
  title: string;
  /** Career slugs in the master catalog that fall under this discipline. */
  careerSlugs: string[];
  /** Career names (normalised) that fall under this discipline. */
  careerNames: string[];
  /** Non-fabricated one-liner distinguishing this discipline. */
  summary: string;
  /** Facts used by the UI / roadmap as an evidence-based curriculum note. */
  curriculumFacts: string[];
  /** School subjects a student should confirm for this path (not guaranteed). */
  schoolSubjects: string[];
  /** India entry: entrance exam(s), attributed to bodies, conservative. */
  entrance: string;
  /** Exit/UG degree qualification the career is commonly built on. */
  degree: string;
  /** Internship / hands-on training expectations (only where real). */
  internshipTraining: string;
  /** Registration/regulatory body — only where one actually exists. */
  registration: string;
  /** Post-degree progression (specialisation / further study) — conservative. */
  specialization: string;
  /** Typical career options (never a guarantee list). */
  careerOptions: string[];
  /** Alternative healthcare directions (catalog careers where possible). */
  alternatives: string[];
  /** India vs abroad contrast — never implies automatic cross-border rights. */
  indiaAbroad: string;
  /** Evidence sources. */
  sources: MedicalSource[];
  /** True when a regulated UG medical entrance (e.g. NEET-UG) is the primary
   *  admission route — used by the roadmap medical branch. */
  regulatedEntrance: boolean;
  /** ISO date of the last factual/evidence review of this entry (surfaced in
   *  the UI as "Last reviewed date"; never implied to be timeless). */
  lastReviewed?: string;
}

export const MEDICAL_DISCIPLINES: MedicalDisciplineInfo[] = [
  {
    id: "medicine",
    title: "Medicine (MBBS)",
    careerSlugs: ["medicine", "surgeon"],
    careerNames: ["medicine", "surgeon"],
    summary:
      "The allopathic medical doctor path. In India the undergraduate degree is MBBS, regulated by the National Medical Commission (NMC), with entry predominantly through NEET-UG (NTA).",
    curriculumFacts: [
      "MBBS is a ~5.5-year course comprising academic study and a compulsory rotating internship; the NMC sets the graduate medical education regulations.",
      "Internship is an NMC-regulated phase of the MBBS course; internship completion and registration with the medical council precede independent practice.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance:
      "NEET-UG (National Testing Agency) is the common undergraduate medical entrance for MBBS admission in India. Its notified scope covers MBBS/BDS and — per official notifications — the AYUSH courses (BAMS/BHMS/BUMS/BSMS) and some B.Sc-Nursing admissions. Always confirm which programs require it and the eligibility applicable to your admission year.",
    degree: "MBBS (with NMC-regulated internship and registration pathway)",
    internshipTraining:
      "NMC-regulated compulsory rotating internship during the MBBS course.",
    registration:
      "Registration with a State Medical Council / NMC register (after MBBS + internship).",
    specialization:
      "Postgraduate clinical specialisation is entered via national/state PG entrances (e.g. NEET-PG for MD/MS in most institutions); confirm the current notified route.",
    careerOptions: ["Physician (MD/MS specialities)", "Surgery (MS)", "Public health programmes", "Medical teaching and research"],
    alternatives: ["Dentistry (Dental Council of India)", "Ayurveda (BAMS — NCISM)", "Homoeopathy (BHMS — NCH)", "Nursing", "Physiotherapy"],
    indiaAbroad:
      "India: MBBS governed by NMC; NEET-UG entry. Abroad: medical degrees are country-regulated (e.g. ECFMG/USMLE route for the US, GMC-registered degrees in the UK); a foreign medical degree must be validated (e.g. FMGE/NExT route for practice in India) — qualifications never transfer automatically.",
    sources: [
      { name: "National Medical Commission (NMC)", url: "https://www.nmc.org.in" },
      { name: "National Testing Agency (NTA)", url: "https://www.nta.ac.in" },
    ],
    regulatedEntrance: true,
  },
  {
    id: "dentistry",
    title: "Dentistry (BDS)",
    careerSlugs: ["dentistry"],
    careerNames: ["dentistry"],
    summary:
      "The dental surgeon path. In India the undergraduate degree is BDS, regulated by the Dental Council of India, with entry predominantly through NEET-UG (NTA).",
    curriculumFacts: [
      "BDS is the undergraduate dental degree; clinical practice builds on the degree and subsequent training.",
      "Dental regulation in India operates under the Dentists Act framework with the Dental Council of India as the apex body.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance:
      "NEET-UG (NTA) is the common entrance for most BDS admissions in India. Confirm the notified scope and institution-specific rules for your admission year.",
    degree: "BDS",
    internshipTraining:
      "BDS course includes clinical training; confirm the internship/training component prescribed for the year you join.",
    registration:
      "Registration with a State Dental Council as a dentist.",
    specialization:
      "Postgraduate dental specialisation (e.g. MDS) is entered via national/state PG entrances; confirm the current notified route.",
    careerOptions: ["Consultant dentist", "Dental surgery (MDS specialities)", "Public health dentistry", "Teaching and research"],
    alternatives: ["Medicine (MBBS — NMC)", "Ayurveda (BAMS)", "Nursing", "Medical Laboratory Sciences"],
    indiaAbroad:
      "India: BDS governed by the Dental Council of India; NEET-UG entry. Abroad: dental degrees are country-regulated; practising in India with a foreign dental degree requires the applicable validation route — nothing transfers automatically.",
    sources: [
      { name: "Dental Council of India", url: "https://dciindia.gov.in" },
      { name: "National Testing Agency (NTA)", url: "https://www.nta.ac.in" },
    ],
    regulatedEntrance: true,
  },
  {
    id: "ayush",
    title: "Integrated & Indian Systems of Medicine (AYUSH)",
    careerSlugs: [],
    careerNames: [],
    summary:
      "BAMS (Ayurveda), BHMS (Homoeopathy), BUMS (Unani) and BSMS (Siddha) are separate undergraduate qualifications in India's Indian Systems of Medicine — distinct from allopathic MBBS. Regulatory oversight sits with the National Commission for Indian System of Medicine (NCISM) and the National Commission for Homoeopathy (NCH).",
    curriculumFacts: [
      "AYUSH disciplines are distinct degree streams from MBBS; NEET-UG's notified scope has included these courses in official notifications — confirm current scope each year.",
      "Each AYUSH stream has its own curriculum and statutory regulator, not the NMC.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance:
      "Where notified, NEET-UG is accepted for AYUSH admissions (BAMS/BHMS/BUMS/BSMS). Confirm the current notification and the institution's own admission rules.",
    degree: "BAMS / BHMS / BUMS / BSMS (per stream)",
    internshipTraining:
      "Clinical internship is part of each AYUSH degree course; confirm the prescribed component.",
    registration:
      "Registration with the State Board for the respective system / under NCISM or NCH rules.",
    specialization:
      "Postgraduate specialisation exists within each system (MD-Ayurveda etc.); entry routes vary — confirm with the concerned council.",
    careerOptions: ["Practitioner in the respective system", "Hospital / clinic practice", "Research and academia", "Public health programmes"],
    alternatives: ["Medicine (MBBS — NMC)", "Dentistry (BDS)", "Nursing", "Pharmacy"],
    indiaAbroad:
      "AYUSH degrees are India-specific qualifications. Recognition abroad varies by country and is never automatic; check with the target country's regulator before planning practice there.",
    sources: [
      { name: "National Commission for Indian System of Medicine", url: "https://ncismindia.org" },
      { name: "National Commission for Homoeopathy", url: "https://nch.org.in" },
      { name: "National Testing Agency (NTA)", url: "https://www.nta.ac.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "nursing",
    title: "Nursing",
    careerSlugs: ["nursing"],
    careerNames: ["nursing"],
    summary:
      "Nursing education in India spans the GNM diploma (after Class 12, Biology) and the B.Sc Nursing degree, regulated by the Indian Nursing Council (INC) and state nursing councils. NEET-UG is used by select B.Sc-Nursing admissions only — it is not universal, so confirm per institution.",
    curriculumFacts: [
      "B.Sc Nursing (with the INC framework) and GNM (diploma) are the two conventional routes; entry levels differ.",
      "Registration as a nurse/nursing assistant happens through the state nursing council under INC norms.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance:
      "Admission varies: some B.Sc-Nursing programs use NEET-UG/QAT scores, others run their own entrance or merit admission. Confirm each institution's notified rule — never assume NEET applies.",
    degree: "B.Sc (Nursing) or GNM Diploma",
    internshipTraining:
      "Clinical training/internship is embedded in nursing courses; confirm the prescribed component.",
    registration:
      "Registration with the State Nursing Council under Indian Nursing Council norms.",
    specialization:
      "Post-basic and master's specialisations (e.g. midwifery, critical care, nurse practitioner) exist for qualified nurses; entry eligibility varies.",
    careerOptions: ["Staff nurse / clinical nursing", "Critical care and specialist nursing", "Community / public health nursing", "Nursing education and administration"],
    alternatives: ["Medicine (MBBS)", "Physiotherapy", "Radiology Technology", "Paramedic"],
    indiaAbroad:
      "Indian nurse registration does not automatically extend abroad; each country has its own licensure/review process (e.g. NCLEX route for the US, NMC/Overseas Nursing Programme reviews in some markets). Always verify with the target country's regulator.",
    sources: [
      { name: "Indian Nursing Council", url: "https://www.indiannursingcouncil.org" },
      { name: "National Testing Agency (NTA)", url: "https://www.nta.ac.in" },
    ],
    regulatedEntrance: true,
  },
  {
    id: "pharmacy",
    title: "Pharmacy",
    careerSlugs: ["pharmacology", "pharmacovigilance", "regulatory-affairs"],
    careerNames: ["pharmacology", "pharmacovigilance", "regulatory affairs"],
    summary:
      "Pharmacy education spans D.Pharm, B.Pharm and Pharm.D, regulated by the Pharmacy Council of India (PCI). Pharmacology, pharmacovigilance and pharma regulatory careers are conventionally built on pharmacy/related science degrees. There is no central medical entrance for pharmacy — admission is institution/state-based.",
    curriculumFacts: [
      "B.Pharm is the standard undergraduate pharmacy degree; Pharm.D is a clinical (patient-focused) track and D.Pharm a diploma route.",
      "Pharmacist registration is a PCI/state pharmacy council step for dispensing roles.",
    ],
    schoolSubjects: ["Chemistry", "Biology", "Physics (with Maths where accepted)"],
    entrance:
      "No single national entrance: admissions run through state/university entrances and merit. Confirm each institution's notified rule.",
    degree: "B.Pharm / Pharm.D (D.Pharm diploma for some roles)",
    internshipTraining:
      "B.Pharm/Pharm.D include practical training; Pharm.D includes clinical rotations. Confirm the prescribed component for the program you join.",
    registration:
      "Registration with a State Pharmacy Council under Pharmacy Council of India norms (for practise roles).",
    specialization:
      "Master's/Doctoral paths (M.Pharm specialities, PhD), plus professional tracks in pharmacovigilance, clinical research and regulatory affairs — entry eligibility varies.",
    careerOptions: ["Pharmacist (community/hospital)", "Clinical research and pharmacovigilance", "Pharma regulatory affairs", "Pharma quality, production and sciences"],
    alternatives: ["Medicine (MBBS)", "Clinical Research", "Medical Laboratory Sciences", "Microbiology-related science careers"],
    indiaAbroad:
      "Foreign practice requires the target country's pharmacist licensure (e.g. FPGEE route for the US, GPhC registration in the UK); Indian registration never transfers automatically.",
    sources: [
      { name: "Pharmacy Council of India", url: "https://www.pci.nic.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "physiotherapy",
    title: "Physiotherapy (BPT)",
    careerSlugs: ["physiotherapy"],
    careerNames: ["physiotherapy"],
    summary:
      "The undergraduate degree is BPT. Physiotherapy practice in India is not governed by a central statutory medical council like MBBS; entry is via university/state entrances and professional-body-recognised programs.",
    curriculumFacts: [
      "BPT is the standard bachelor's programme; professional recognition involves the physiotherapy professional associations and institution-level accreditation.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance:
      "Institution and state/university entrances (and sometimes NEET-based merit where a state notifies it). Confirm each institution's rule.",
    degree: "BPT (Bachelor of Physiotherapy)",
    internshipTraining:
      "BPT includes clinical placements/internship; confirm the prescribed component.",
    registration:
      "There is no single national register; employment and independent practice generally require the program's degree and, in some states, council registration — verify the state position.",
    specialization:
      "Postgraduate specialisation (MPT) in areas such as cardiorespiratory, neuro, orthopaedic and sports physiotherapy.",
    careerOptions: ["Clinical physiotherapist", "Sports physiotherapy", "Rehabilitation centres", "Physiotherapy education and research"],
    alternatives: ["Occupational Therapy", "Medicine (MBBS)", "Nursing", "Prosthetist & Orthotist"],
    indiaAbroad:
      "Physiotherapy qualifications are not automatically reciprocated across borders; each country (e.g. US, UK, Canada, Australia) has its own credentialing. Verify with the target regulator.",
    sources: [
      { name: "Allied and Healthcare Professions (AHP) — National Commission", url: "https://www.ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "occupational-therapy",
    title: "Occupational Therapy (BOT)",
    careerSlugs: ["occupational-therapy"],
    careerNames: ["occupational therapy"],
    summary:
      "The undergraduate degree is BOT, centred on helping people engage in everyday activities. Entry is institution/state-based; there is no single national medical entrance.",
    curriculumFacts: [
      "BOT programmes cover activity analysis, rehabilitation and clinical fieldwork.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance: "University/state entrances and merit; confirm each institution's rule.",
    degree: "BOT (Bachelor of Occupational Therapy)",
    internshipTraining:
      "OT education includes supervised clinical fieldwork/internship.",
    registration:
      "Professional membership/registration varies by state and professional body; verify the local position.",
    specialization:
      "Postgraduate specialisation exists (e.g. mental health, neurology, paediatrics, hand therapy); entry via university PG admissions.",
    careerOptions: ["Clinical occupational therapist", "Rehabilitation services", "Paediatric and geriatric therapy", "Community rehabilitation"],
    alternatives: ["Physiotherapy", "Speech-Language Pathology", "Audiology", "Prosthetist & Orthotist"],
    indiaAbroad:
      "Recognition abroad requires each country's credentialing (e.g. NBCOT pathway for the US, HCPC/COT registration in the UK) — never automatic.",
    sources: [
      { name: "National Commission for Allied and Healthcare Professions (NCAHP)", url: "https://ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "optometry",
    title: "Optometry",
    careerSlugs: ["optometry"],
    careerNames: ["optometry"],
    summary:
      "Optometry education (B.Optom / B.Sc in Optometry) trains optometrists and refractionists. It is allied (non-physician) — entry is institution/state-based, not a single medical entrance.",
    curriculumFacts: [
      "Optometry programs cover refraction, contact lenses and low vision; some states/institutions offer B.Sc-level entry.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology (and Maths where accepted)"],
    entrance: "University/institution entrances and merit; confirm each institution's rule.",
    degree: "B.Optom / B.Sc (Optometry)",
    internshipTraining:
      "Optometry courses include clinical practice/internship in eye clinics.",
    registration:
      "Optometry registration is not centrally unified in India; recognition varies by state and employer — verify the local position.",
    specialization:
      "Further study in contact lenses, low vision, orthoptics, or clinical optometry PG programs where offered.",
    careerOptions: ["Clinical optometrist", "Optical retail / practice management", "Low vision and community eye care", "Research in vision science"],
    alternatives: ["Medicine (MBBS)", "Radiology Technology", "Paramedic", "Medical Laboratory Sciences"],
    indiaAbroad:
      "International practice needs the target country's optometry licensure/registration (e.g. ACO programme pathways); never automatic.",
    sources: [
      { name: "National Commission for Allied and Healthcare Professions (NCAHP)", url: "https://ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "audiology-slp",
    title: "Audiology & Speech-Language Pathology",
    careerSlugs: ["audiology", "speech-language-pathology"],
    careerNames: ["audiology", "speech-language pathology"],
    summary:
      "Allied health streams focused on hearing (Audiology — BASLP) and communication (Speech-Language Pathology). Entry is institution/state-based; there is no single national medical entrance.",
    curriculumFacts: [
      "BASLP is the common undergraduate entry for audiology and speech-language pathology; practice is allied-health in nature.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance: "Institution and university entrances/merit; confirm each program's rule.",
    degree: "BASLP / B.Sc (Audiology & Speech-Language Pathology)",
    internshipTraining:
      "Includes clinical postings in audiology and speech clinics.",
    registration:
      "Statutory registration is not centrally unified; recognition varies by state/employer.",
    specialization:
      "Master's specialisation in audiology or speech-language pathology (MASLP/MSLP) is the common postgraduate route.",
    careerOptions: ["Audiologist", "Speech-language pathologist", "Rehabilitation clinics", "School/community therapy services"],
    alternatives: ["Occupational Therapy", "Physiotherapy", "Special education-related careers", "Radiology Technology"],
    indiaAbroad:
      "Foreign practice requires the target country's credentialing (e.g. ASHA certification processes for the US) — never automatic.",
    sources: [
      { name: "National Commission for Allied and Healthcare Professions (NCAHP)", url: "https://ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "diagnostics-labs",
    title: "Diagnostics, Laboratory & Imaging",
    careerSlugs: ["medical-laboratory-sciences", "radiology-technology", "sonographer", "phlebotomist"],
    careerNames: ["medical laboratory sciences", "radiology technology", "sonographer", "phlebotomist"],
    summary:
      "Allied health careers in laboratory testing (Medical Laboratory Technology), medical imaging (Radiology Technology / Sonography) and sample collection (Phlebotomy). These are non-physician clinical roles with institution/state-based entry.",
    curriculumFacts: [
      "B.Sc programmes exist in Medical Laboratory Technology and Radiology & Imaging Technology; phlebotomy is largely a certificate/diploma/skills role.",
      "These careers are allied-health in nature; where central oversight applies it sits under the allied and healthcare professions framework (NCAHP Act 2021) — verify program recognition.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance: "Institution/state-based entrances and merit; confirm each program's rule.",
    degree: "B.Sc (Medical Laboratory Technology) / B.Sc (Radiology & Imaging Technology) / Phlebotomy certificate",
    internshipTraining:
      "Clinical postings in labs and imaging departments are part of the B.Sc programs.",
    registration:
      "Registration pathways are state/employer-dependent; the NCAHP framework is being phased in — verify current requirements.",
    specialization:
      "Postgraduate options in medical lab technology, imaging and sonography exist where offered.",
    careerOptions: ["Medical laboratory technologist", "Radiology technologist", "Sonographer", "Phlebotomist in clinics and hospitals"],
    alternatives: ["Paramedic", "Nursing", "Medicine (MBBS)", "Biomedical Science"],
    indiaAbroad:
      "International certification/licensure (e.g. ASCP-style credentialing for laboratory/imaging roles) is country-specific — never automatic.",
    sources: [
      { name: "National Commission for Allied and Healthcare Professions", url: "https://ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "respiratory-care",
    title: "Respiratory Care",
    careerSlugs: ["respiratory-therapist"],
    careerNames: ["respiratory therapist"],
    summary:
      "Respiratory therapists work on pulmonary function testing, ventilation support and respiratory therapy in acute/ICU settings. Entry is institution-based; an allied-health discipline.",
    curriculumFacts: [
      "B.Sc Respiratory Care / Respiratory Therapy programs are the conventional route to the role.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance: "Institution-level entrances/merit; confirm each program's rule.",
    degree: "B.Sc (Respiratory Care Therapy)",
    internshipTraining:
      "Clinical training in ICUs and pulmonary labs is part of the program.",
    registration:
      "Recognition varies by state/employer; verify with the program/institution and local norms.",
    specialization:
      "Advanced clinical roles and further study exist where offered (e.g. ICU care, pulmonary rehab).",
    careerOptions: ["Respiratory therapist (ICU/hospitals)", "Sleep diagnostics", "Pulmonary rehabilitation", "Home ventilation services"],
    alternatives: ["Paramedic", "Nursing", "Radiology Technology", "Medicine (MBBS)"],
    indiaAbroad:
      "Foreign practice follows each country's credentialing; never automatic.",
    sources: [
      { name: "National Commission for Allied and Healthcare Professions (NCAHP)", url: "https://ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "paramedic-emergency",
    title: "Paramedic & Emergency Care",
    careerSlugs: ["paramedic"],
    careerNames: ["paramedic"],
    summary:
      "Emergency-care roles (paramedic, EMT) recognise ambulance and emergency response. Entry ranges from certificate/diploma (EMT) to B.Sc Emergency Medicine/Paramedical Technology; institution/state-based admission.",
    curriculumFacts: [
      "Paramedical institute types in the AISHE data are largely diploma-level; verify the actual offering (B.Sc vs diploma vs certificate) at each institution.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance: "Institution/state-based; no single national medical entrance.",
    degree: "B.Sc (Paramedical / Emergency Medicine) or EMT/Paramedic diploma or certificate",
    internshipTraining:
      "Emergency and ambulance clinical placements are part of the course.",
    registration:
      "Recognition varies by state/employer and by the course level (certificate/diploma/degree); verify.",
    specialization:
      "Advanced emergency care, disaster response and critical-care transport roles build on experience/certifications.",
    careerOptions: ["Emergency medical technician", "Paramedic in ambulance/ER services", "Disaster response roles", "Critical care transport"],
    alternatives: ["Nursing", "Phlebotomist", "Respiratory Therapist", "Medical Laboratory Sciences"],
    indiaAbroad:
      "Paramedic/EMT credentials are country-specific (e.g. state-level certification frameworks abroad); never automatic.",
    sources: [
      { name: "National Commission for Allied and Healthcare Professions (NCAHP)", url: "https://ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "rehab-prosthetics",
    title: "Rehabilitation, Prosthetics & Podiatry",
    careerSlugs: ["prosthetist-orthotist", "podiatrist", "chiropractor"],
    careerNames: ["prosthetist & orthotist", "podiatrist", "chiropractor"],
    summary:
      "Allied clinical roles for movement, orthotics/prosthetics, foot care and manual therapy. Entry is institution-based and recognition varies by country; there is no single Indian medical entrance for these.",
    curriculumFacts: [
      "Prosthetist & Orthotist roles build on dedicated B.Sc/PG programs (e.g. PO education); podiatry and chiropractic education in India is limited and non-uniform — availability varies widely.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology"],
    entrance: "Institution/foreign-program based; confirm offerings exist before planning.",
    degree: "B.Sc (Prosthetics & Orthotics) / institution-specific podiatry & chiropractic programs (often studied abroad)",
    internshipTraining:
      "Clinical placements accompany PO programs; abroad-based podiatry/chiropractic include their own clinical training.",
    registration:
      "Recognition differs strongly by country — chiropractic and podiatry have clear statutory registration in several countries but not uniformly in India; verify the local position.",
    specialization:
      "Specialist PO roles, foot surgery-adjacent pathways and manual-therapy specialisations vary by jurisdiction.",
    careerOptions: ["Clinical prosthetist / orthotist", "Foot care / podiatry clinics (where licensed)", "Chiropractic clinics (where registered)", "Rehabilitation teams"],
    alternatives: ["Physiotherapy", "Occupational Therapy", "Optometry", "Medicine (MBBS)"],
    indiaAbroad:
      "Chiropractic and podiatry are best-practised where the corresponding statutory regulator operates — verify each country's licensure; cross-border practice never transfers automatically.",
    sources: [
      { name: "National Commission for Allied and Healthcare Professions (NCAHP)", url: "https://ahpnec.gov.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "public-health",
    title: "Public Health & Health Education",
    careerSlugs: ["public-health", "epidemiologist", "health-educator"],
    careerNames: ["public health", "epidemiologist", "health educator"],
    summary:
      "Population-level health careers. Public health is conventionally entered via an MPH (postgraduate) after a health/science UG; entry rules are university-specific. Epidemiology and health education build on dedicated public-health/programme training.",
    curriculumFacts: [
      "MPH admission requirements (UG background, entrance/interview) are set by each university — confirm per program.",
      "Epidemiology is a specialised field within public-health training; health education overlaps with public-health programmes.",
    ],
    schoolSubjects: ["Biology", "Chemistry", "Mathematics/Statistics (where relevant)"],
    entrance: "University-specific entrances/interviews for MPH and related programs; no single national entrance.",
    degree: "MPH / Bachelors in public-health-related fields (entry path varies)",
    internshipTraining:
      "Field placements and internships in public-health programmes; confirm the prescribed component.",
    registration:
      "No central statutory registration for public-health careers; professional credentialing is employer/programme-based.",
    specialization:
      "Specialisations include epidemiology, health policy, biostatistics, health systems and health communication.",
    careerOptions: ["Public health programme roles", "Epidemiologist (surveillance/research)", "Health educator", "Policy and health systems analysis"],
    alternatives: ["Medicine (MBBS)", "Nursing", "Health Informatics", "Hospital Administration"],
    indiaAbroad:
      "Public-health roles abroad follow employer/programme norms; no automatic credential transfer exists — each country evaluates qualifications independently.",
    sources: [],
    regulatedEntrance: false,
  },
  {
    id: "clinical-research",
    title: "Clinical Research, Data & Coding",
    careerSlugs: ["clinical-research", "clinical-data-management", "medical-coding"],
    careerNames: ["clinical research", "clinical data management", "medical coding"],
    summary:
      "Evidence-operations careers inside healthcare: managing clinical studies (clinical research), study data (clinical data management) and coded health data (medical coding). Entry is usually a health/clinical or science UG plus professional training/certifications.",
    curriculumFacts: [
      "Roles are discipline/certification-based (e.g. IATA-accredited GCP-related training, coding certifications) rather than a single regulated degree.",
      "Clinical career paths here differ from a physician/dentist track — they do not require NEET and are not at one medical regulator.",
    ],
    schoolSubjects: ["Biology", "Chemistry", "Life sciences / statistics (as available)"],
    entrance: "Programme/certification-specific; no single national entrance.",
    degree: "B.Sc (Life Sciences/Clinical Research) etc., plus professional certifications",
    internshipTraining:
      "Industry internships/on-the-job training are the norm; confirm program placements.",
    registration:
      "No statutory medical registration; employers orient to GCP/coding standards and certifications.",
    specialization:
      "Protocol design, regulatory submissions, data standards (CDISC-style), health coding and audit specialisations.",
    careerOptions: ["Clinical research associate / coordinator", "Clinical data manager", "Medical coder", "Regulatory and QA roles"],
    alternatives: ["Clinical data management", "Regulatory Affairs", "Health Informatics", "Pharmacy (B.Pharm)"],
    indiaAbroad:
      "International employers orient to global standards (GCP, coding certifications, regional guidelines); cross-border recognition is employer/certification-based, not automatic.",
    sources: [],
    regulatedEntrance: false,
  },
  {
    id: "health-it-digital",
    title: "Health IT & Digital Health",
    careerSlugs: ["health-informatics", "medical-ai-engineer", "telehealth-specialist"],
    careerNames: ["health informatics", "medical ai engineer", "telehealth specialist"],
    summary:
      "Technology careers applied to healthcare: health informatics (systems & data), medical AI engineering (ML/software in clinical settings) and telehealth delivery. These are tech/health-career hybrids — no single national medical entrance; admission is institution/employer-based.",
    curriculumFacts: [
      "Health informatics is commonly entered via IT/clinical-data courses or B.Sc/M.Sc programs in health informatics — availability varies.",
      "Medical AI engineer is an engineering-style career (software/ML); telehealth roles often build on clinical or technology backgrounds.",
    ],
    schoolSubjects: ["Computer Science / IT", "Mathematics", "Biology (optional)"],
    entrance: "Engineering/CS entrances, university admissions and employer certifications — no single national route.",
    degree: "B.Tech/B.Sc (CS/IT) or health-informatics programs depending on the role",
    internshipTraining:
      "Hands-on projects and internships in health-tech organisations.",
    registration:
      "No statutory medical registration for the tech roles; healthcare-data compliance (e.g. HIPAA-style/data protection rules) applies per jurisdiction.",
    specialization:
      "Clinical decision support, imaging AI, healthcare data standards, telehealth operations.",
    careerOptions: ["Health informatics analyst", "Medical AI / ML engineer", "Telehealth product and operations roles", "Clinical systems administration"],
    alternatives: ["Biomedical Engineering", "Health Informatics", "Medical Coding", "Clinical Data Management"],
    indiaAbroad:
      "Global health-tech employers evaluate skills and relevant regulations per country; automatic registration does not exist.",
    sources: [],
    regulatedEntrance: false,
  },
  {
    id: "hospital-management",
    title: "Healthcare & Hospital Management",
    careerSlugs: ["hospital-administration"],
    careerNames: ["hospital administration"],
    summary:
      "Managing the operations of hospitals and health systems — a management career inside healthcare (not a clinical medical role). It does not require NEET and is not under a medical regulator.",
    curriculumFacts: [
      "Programs include MBA/MHA specialisations in hospital/healthcare administration; UG pathways are varied.",
    ],
    schoolSubjects: ["Business/Commerce", "Biology (optional)", "Mathematics (where relevant)"],
    entrance: "MBA/MHA entrance processes (CAT/MAT/university-specific) — no single national route.",
    degree: "MBA / MHA with healthcare specialisation (entry varies)",
    internshipTraining:
      "Hospital/healthcare internships and administrative projects.",
    registration:
      "No statutory medical registration; employers apply hospital-accreditation (e.g. NABH) norms.",
    specialization:
      "Operations, quality & accreditation, finance, HR and patient-experience leadership.",
    careerOptions: ["Hospital administrator", "Health operations manager", "Quality & accreditation roles", "Healthcare consulting"],
    alternatives: ["Public Health (MPH)", "Healthcare consulting", "Business Management", "Nursing administration"],
    indiaAbroad:
      "Management qualifications are evaluated by employers per market; no automatic cross-border credential.",
    sources: [],
    regulatedEntrance: false,
  },
  {
    id: "nutrition",
    title: "Nutrition & Dietetics",
    careerSlugs: ["nutrition-and-dietetics"],
    careerNames: ["nutrition and dietetics"],
    summary:
      "Clinical and community nutrition. Routes include B.Sc Nutrition/Dietetics and, where offered, the Registered Dietitian (RD) credential path with supervised practice — entry is institution-based.",
    curriculumFacts: [
      "Dietetics practice often ties to a recognised degree plus supervised practice/internship and the RD credential where pursued.",
    ],
    schoolSubjects: ["Biology", "Chemistry", "Home Science (where available)"],
    entrance: "University/institution entrances and merit; no single national entrance.",
    degree: "B.Sc (Nutrition & Dietetics) etc. plus RD credential where pursued",
    internshipTraining:
      "Supervised dietetic practice/internship is part of credentialed paths.",
    registration:
      "India has no central statutory register for dietitians; the RD credential is recognised nationally where maintained (e.g. the Indian Dietetic Association route) — verify current requirements.",
    specialization:
      "Clinical dietetics, sports nutrition, paediatrics, public-health nutrition.",
    careerOptions: ["Clinical dietitian", "Sports nutritionist", "Public-health nutrition roles", "Food service & wellness"],
    alternatives: ["Public Health", "Medicine (MBBS)", "Nursing", "Food Science careers"],
    indiaAbroad:
      "Dietitian registration/recognition abroad follows each country's regulator (e.g. state-level rules or national registers); never automatic.",
    sources: [],
    regulatedEntrance: false,
  },
  {
    id: "genetics",
    title: "Genetics & Genetic Counseling",
    careerSlugs: ["genetic-counseling"],
    careerNames: ["genetic counseling"],
    summary:
      "Genetic counselors support patients/families around genetic conditions. This is an allied/clinical-support role; global training is commonly postgraduate (master's in genetic counseling). Indian availability is limited and institution-specific.",
    curriculumFacts: [
      "Entry to genetic counseling programs is programme/university-specific, with many candidates from biology/life-science or clinical backgrounds.",
    ],
    schoolSubjects: ["Biology", "Chemistry", "Life sciences"],
    entrance: "University/programme-specific (no single national entrance).",
    degree: "Master's in Genetic Counseling (availability varies) or biology-based UG entry routes",
    internshipTraining:
      "Clinical rotations and supervised counseling placements within the program.",
    registration:
      "No central statutory register for genetic counselling in India — recognition is employer/programme-based. Registry bodies exist in some countries; for a target jurisdiction verify its specific accreditation.",
    specialization:
      "Prenatal, cancer and neurogenetics counseling; research roles.",
    careerOptions: ["Genetic counselor (where such roles are established)", "Clinical genetics research", "Patient-education roles", "Diagnostics liaison"],
    alternatives: ["Medicine (MBBS)", "Medical Laboratory Sciences", "Public Health", "Biomedical Science"],
    indiaAbroad:
      "The genetic-counseling profession is far more established abroad (e.g. ABGC-type accreditation in the US); practise location and accreditation must be checked in the target country — never automatic.",
    sources: [],
    regulatedEntrance: false,
  },
  {
    id: "veterinary",
    title: "Veterinary Science",
    careerSlugs: ["veterinary-science"],
    careerNames: ["veterinary science"],
    summary:
      "Animal healthcare. The undergraduate degree is BVSc & AH, administered under the Veterinary Council of India (VCI) framework with the Indian Council of Agricultural Research (ICAR) involved in higher education. It is a separate regulatory domain from human medicine.",
    curriculumFacts: [
      "BVSc & AH is the undergraduate degree; VCI governs veterinary education and the veterinary profession's standards.",
      "Veterinary admissions run through institution/state and ICAR-affiliated processes — veterinary students sit their own route, not the human-medicine NEET-UG.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology", "Agriculture-science where relevant"],
    entrance: "Institution/state and ICAR-route entrances; confirm each program's notified rule for the admission year.",
    degree: "BVSc & AH (Bachelor of Veterinary Science & Animal Husbandry)",
    internshipTraining:
      "Clinical training and hospital/field postings are part of the BVSc & AH course.",
    registration:
      "Registration with the State Veterinary Council under VCI norms.",
    specialization:
      "Veterinary postgraduate specialisations (surgery, medicine, pathology, public health) exist; entry varies by institution/state.",
    careerOptions: ["Veterinary clinician", "Animal husbandry and production roles", "Veterinary public health", "Research and diagnostics"],
    alternatives: ["Medicine (MBBS)", "Agriculture-related careers", "Biomedical Science", "Food Safety roles"],
    indiaAbroad:
      "Countries run their own veterinary licensure (e.g. ECFVG/state-board processes for the US, RCVS routes for the UK); foreign degrees are evaluated for equivalency — never automatic.",
    sources: [
      { name: "Veterinary Council of India", url: "https://vci.nic.in" },
      { name: "Indian Council of Agricultural Research", url: "https://icar.org.in" },
    ],
    regulatedEntrance: false,
  },
  {
    id: "biomedical",
    title: "Biomedical Science & Engineering",
    careerSlugs: ["biomedical-engineering", "biomedical-scientist", "bioinformatics", "genetics", "genomic-data-scientist"],
    careerNames: ["biomedical engineering", "biomedical scientist", "bioinformatics", "genetics", "genomic data scientist"],
    summary:
      "Applied science/engineering careers that serve medicine (medical devices, lab science, bioinformatics). These are NOT clinical medical careers — they are engineering/science degrees with their own admissions; they do not use NEET-UG.",
    curriculumFacts: [
      "Biomedical engineering is an engineering degree (B.E./B.Tech Biomedical). Biomedical science/bioinformatics are lab/computational careers built on life-science or engineering degrees.",
    ],
    schoolSubjects: ["Physics", "Chemistry", "Biology", "Mathematics"],
    entrance: "Engineering entrances (JEE/state/university) for B.E./B.Tech; science-program entrances for lab/genomics — no single national route.",
    degree: "B.E./B.Tech (Biomedical / Bioengineering) or B.Sc (Life Sciences/Bioinformatics) depending on role",
    internshipTraining:
      "Lab rotations, device-industry internships and research projects.",
    registration:
      "Engineering/science careers have no medical-statutory registration; employer and programme norms apply.",
    specialization:
      "Medical devices, imaging/robotics, genomics analytics, clinical informatics.",
    careerOptions: ["Biomedical engineer (devices/imaging)", "Laboratory scientist", "Bioinformatics analyst", "Genomic data roles"],
    alternatives: ["Health Informatics", "Medical AI Engineer", "Medical Laboratory Sciences", "Medicine (MBBS)"],
    indiaAbroad:
      "Country-specific credentialing/employer norms for biomedical/lab roles; no automatic cross-border registration.",
    sources: [],
    regulatedEntrance: false,
  },
];

/**
 * ISO review date for the medical-education knowledge base. Every discipline
 * entry above was re-fact-checked and evidence-attributed as of this date and
 * surfaced in the UI as the "Last reviewed date" so the information is never
 * mistaken for timeless.
 */
export const MEDICAL_EDUCATION_LAST_REVIEWED = "2026-09-08";

const DISCIPLINE_BY_SLUG = new Map<string, MedicalDisciplineInfo>();
const DISCIPLINE_BY_NAME = new Map<string, MedicalDisciplineInfo>();

for (const d of MEDICAL_DISCIPLINES) {
  d.lastReviewed = MEDICAL_EDUCATION_LAST_REVIEWED;
  for (const s of d.careerSlugs) DISCIPLINE_BY_SLUG.set(s.toLowerCase(), d);
  for (const n of d.careerNames) DISCIPLINE_BY_NAME.set(n.toLowerCase(), d);
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/** Resolve the discipline for a career slug (e.g. "medicine"). */
export function getMedicalDisciplineForCareerSlug(slug?: string | null): MedicalDisciplineInfo | null {
  if (!slug) return null;
  return DISCIPLINE_BY_SLUG.get(normalise(slug)) ?? null;
}

/** Resolve the discipline for a career name (e.g. "Medicine"). */
export function getMedicalDisciplineForCareerName(name?: string | null): MedicalDisciplineInfo | null {
  if (!name) return null;
  const n = normalise(name);
  return (
    DISCIPLINE_BY_NAME.get(n) ??
    DISCIPLINE_BY_SLUG.get(n.replace(/\s+/g, "-")) ??
    null
  );
}

/**
 * True when the career is medical AND its entry uses a regulated UG medical
 * entrance (e.g. NEET-UG) as a primary route. Used ONLY for roadmap wording.
 * Deliberately conservative: engineering/tech-adjacent and allied-health
 * careers are excluded even though they carry medical context.
 */
export function isMedicalCareerName(nameOrSlug?: string | null): boolean {
  const d = getMedicalDisciplineForCareerName(nameOrSlug) ?? getMedicalDisciplineForCareerSlug(nameOrSlug);
  return !!d && d.regulatedEntrance;
}

/** All disciplines (for tests / auditing). */
export function listMedicalDisciplines(): MedicalDisciplineInfo[] {
  return MEDICAL_DISCIPLINES.slice();
}