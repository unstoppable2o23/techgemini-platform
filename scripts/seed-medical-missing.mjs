import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const careers = [
  {
    name: "Surgeon",
    title: "Surgeon",
    introduction: "Surgeons perform operations to treat injuries, diseases and deformities — from routine appendectomies to complex organ transplants. They combine deep anatomical knowledge with exceptional hand-eye coordination and calm decision-making under extreme pressure.",
    whoShouldPursue: ["Students fascinated by anatomy and hands-on intervention", "Calm, precise individuals who thrive under pressure", "Those drawn to high-stakes, high-impact healthcare"],
    workNature: { description: "Surgeons diagnose surgical conditions, perform operations and manage pre- and post-operative care.", examples: ["Performing surgical procedures", "Managing surgical teams", "Providing post-operative care"] },
    eligibility: ["MBBS (NEET UG)", "MS/DNB General Surgery (NEET PG)", "MCh super-speciality for advanced fields"],
    stats: { salary: { entry: "12-18 LPA", median: "25-50 LPA", senior: "60-150 LPA", currency: "INR" }, jobGrowth: "+12%", demandLevel: "High", topIndustries: ["Hospitals", "Surgical Centres", "Medical Colleges", "Defence Medical Services"], futureOutlook: "Surgical demand grows with an ageing population and expanding private hospital networks; super-specialists are in acute shortage." },
    pathways: [{ name: "Academic Route", steps: [{ title: "MBBS", description: "5.5-year MBBS via NEET UG." }, { title: "MS General Surgery", description: "3-year MS via NEET PG." }, { title: "MCh / Fellowship", description: "Super-speciality training (e.g., Cardiac, Neuro)." }] }],
    conventionalOptions: [{ title: "General Surgeon", description: "Broad surgical practice in hospitals." }],
    newAgeOptions: [{ title: "Robotic Surgeon", description: "Minimally invasive robotic-assisted surgery." }],
    aiRelatedOptions: [{ title: "Surgical AI Specialist", description: "AI-guided surgical planning and navigation." }],
    videoRecommendations: [],
    seo: { title: "Surgeon Career in India: MBBS to MS Surgery Salary & Scope", description: "Surgeon career guide for India — NEET path, MS Surgery, salary and surgical specialities.", keywords: ["surgeon career India", "MS surgery salary", "how to become surgeon"], faqs: [{ question: "How to become a surgeon in India?", answer: "Complete MBBS (NEET UG), then MS General Surgery (NEET PG), followed by super-speciality if desired." }] },
    cat: "Healthcare & Medicine", sub: "Allopathic Medicine",
    tech: ["Surgical Procedures", "Operative Techniques", "Pre/Post-operative Care", "Surgical Safety Protocols", "Minimally Invasive Surgery"],
    soft: ["Precision", "Decision-making Under Pressure", "Team Leadership"],
    int: ["Surgery and intervention", "Saving lives", "Anatomy and technique"],
    per: ["Precise", "Composed", "Resilient"],
    deg: ["MBBS (NEET UG)", "MS General Surgery (NEET PG)", "MCh Super-speciality optional"],
    subj: ["Biology", "Chemistry", "Physics"],
    tools: ["Surgical Instruments", "Laparoscopic Equipment", "Surgical Navigation", "EMR Systems"],
    acts: ["Performing operations", "Managing surgical patients", "Leading surgical teams", "Advancing surgical techniques"],
    env: "Hospitals, surgical centres and academic medical centres; on-call and long hours",
    path: ["MBBS Graduate", "MS Surgery Resident", "Fellow / Super-specialist", "Consultant Surgeon / HOD"],
    auto: "Low", ind: "High", glo: "High", rem: "Low",
    rel: ["Medicine", "Anaesthesiology", "Emergency Medicine"],
    minEdu: "Professional Degree",
  },
  {
    name: "Chiropractor",
    title: "Chiropractor",
    introduction: "Chiropractors diagnose and treat musculoskeletal disorders — especially spine-related pain — through hands-on spinal manipulation, mobilisation and rehabilitative exercise. They focus on drug-free, non-surgical care.",
    whoShouldPursue: ["Students interested in hands-on musculoskeletal care", "Those drawn to holistic, non-surgical treatment", "Empathetic communicators with good manual dexterity"],
    workNature: { description: "Chiropractors assess spinal function, perform manual adjustments and prescribe corrective exercises.", examples: ["Assessing spinal function", "Performing adjustments", "Prescribing corrective exercises"] },
    eligibility: ["B.Sc + Doctor of Chiropractic (DC) from accredited program", "Masters in Chiropractic in some countries", "Registration with chiropractic council where applicable"],
    stats: { salary: { entry: "4-7 LPA", median: "8-15 LPA", senior: "18-35 LPA", currency: "INR" }, jobGrowth: "+15%", demandLevel: "Medium", topIndustries: ["Chiropractic Clinics", "Sports Clinics", "Multidisciplinary Health Centres", "Wellness Centres"], futureOutlook: "Musculoskeletal pain and sports injury awareness are driving demand for chiropractic and allied manual therapies in Indian metros." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.Sc Life Sciences", description: "Bachelor's in life sciences or related field." }, { title: "Doctor of Chiropractic", description: "DC program from accredited institution." }] }],
    conventionalOptions: [{ title: "Chiropractor at clinics", description: "Private chiropractic practice." }],
    newAgeOptions: [{ title: "Sports Chiropractor", description: "Elite athlete musculoskeletal care." }],
    aiRelatedOptions: [{ title: "Motion Analysis Chiropractor", description: "AI-assisted posture and gait analysis." }],
    videoRecommendations: [],
    seo: { title: "Chiropractor Career in India: Courses, Salary & Scope", description: "Chiropractor career guide for India — DC courses, salary and musculoskeletal care careers.", keywords: ["chiropractor career India", "chiropractic salary", "how to become chiropractor"], faqs: [{ question: "How to become a chiropractor in India?", answer: "Complete a life-sciences bachelor's followed by a Doctor of Chiropractic program from an accredited institution." }] },
    cat: "Healthcare & Medicine", sub: "Physical Rehabilitation",
    tech: ["Spinal Manipulation", "Joint Mobilisation", "Soft Tissue Therapy", "Postural Assessment", "Rehabilitation Exercise Prescription"],
    soft: ["Patient Communication", "Clinical Reasoning", "Empathy"],
    int: ["Musculoskeletal health", "Manual therapy", "Holistic wellness"],
    per: ["Hands-on", "Patient", "Analytical"],
    deg: ["B.Sc + Doctor of Chiropractic (DC) from accredited program", "Masters in Chiropractic (some countries)"],
    subj: ["Biology", "Physics", "Chemistry"],
    tools: ["Adjusting Tables", "Diagnostic Imaging Access", "Therapeutic Modalities", "EMR Systems"],
    acts: ["Assessing spinal function", "Performing adjustments", "Prescribing corrective exercises", "Managing patient care plans"],
    env: "Chiropractic clinics, multidisciplinary health centres and sports clinics",
    path: ["Associate Chiropractor", "Clinic Owner", "Senior Practitioner", "Clinical Director"],
    auto: "Low", ind: "Medium", glo: "High", rem: "Low",
    rel: ["Physiotherapy", "Occupational Therapy", "Sports Medicine"],
    minEdu: "Professional Degree",
  },
  {
    name: "Paramedic",
    title: "Paramedic",
    introduction: "Paramedics are first responders who provide emergency medical care outside hospitals — stabilising trauma victims, administering life support and transporting patients safely to definitive care.",
    whoShouldPursue: ["Students who thrive in high-adrenaline emergency situations", "Calm decision-makers who handle pressure well", "Those passionate about saving lives in the field"],
    workNature: { description: "Paramedics respond to emergencies, provide pre-hospital critical care and transport patients.", examples: ["Responding to emergency calls", "Providing advanced life support", "Transporting critical patients"] },
    eligibility: ["B.Sc Emergency Medical Services / Paramedical Sciences", "Diploma + ALS certification", "PG Diploma in Emergency Medicine for progression"],
    stats: { salary: { entry: "3-6 LPA", median: "6-12 LPA", senior: "12-22 LPA", currency: "INR" }, jobGrowth: "+18%", demandLevel: "High", topIndustries: ["Ambulance Services", "Hospitals (ER)", "Disaster Response", "Air Ambulance"], futureOutlook: "Emergency medical infrastructure investment and 108 ambulance expansion are driving sustained paramedic demand." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.Sc Paramedical / EMS", description: "Bachelor's in paramedical or emergency medical services." }, { title: "ALS Certification", description: "Advanced Life Support and trauma care training." }] }],
    conventionalOptions: [{ title: "Ambulance Paramedic", description: "Pre-hospital emergency care." }],
    newAgeOptions: [{ title: "Critical Care Paramedic", description: "Air ambulance and ICU transport specialist." }],
    aiRelatedOptions: [{ title: "Emergency Response Data Analyst", description: "Data-driven emergency dispatch optimisation." }],
    videoRecommendations: [],
    seo: { title: "Paramedic Career in India: Courses, Salary & Scope", description: "Paramedic career guide for India — BSc EMS courses, salary and emergency response careers.", keywords: ["paramedic career India", "paramedic salary", "how to become paramedic"], faqs: [{ question: "How to become a paramedic in India?", answer: "Complete B.Sc in Emergency Medical Services or paramedical sciences and obtain ALS certification." }] },
    cat: "Healthcare & Medicine", sub: "Emergency Medicine",
    tech: ["Advanced Life Support (ALS)", "Patient Assessment", "Airway Management", "Trauma Care", "Emergency Pharmacology"],
    soft: ["Calm Under Pressure", "Rapid Decision-making", "Team Communication"],
    int: ["Emergency response", "Critical care", "Saving lives in the field"],
    per: ["Resilient", "Decisive", "Composed"],
    deg: ["B.Sc Emergency Medical Services / Paramedical", "BASLP or equivalent + ALS certification", "PG Diploma in Emergency Medicine (for career progression)"],
    subj: ["Biology", "Chemistry", "Physics"],
    tools: ["Ambulance Equipment", "Defibrillators", "Airway Devices", "Portable Monitors"],
    acts: ["Responding to emergencies", "Providing pre-hospital care", "Transporting critical patients", "Documenting patient care"],
    env: "Ambulance services, emergency departments and disaster response; shift work and high stress",
    path: ["Paramedic", "Senior Paramedic", "Team Leader", "EMS Manager / Clinical Lead"],
    auto: "Low", ind: "High", glo: "High", rem: "Low",
    rel: ["Nursing", "Medicine", "Emergency Medical Technician"],
    minEdu: "Bachelor's",
  },
  {
    name: "Prosthetist & Orthotist",
    title: "Prosthetist & Orthotist",
    introduction: "Prosthetists & Orthotists design, fabricate and fit artificial limbs (prostheses) and supportive braces (orthoses) — restoring mobility and independence to people with amputations or disabilities.",
    whoShouldPursue: ["Students who love biomechanics and custom fabrication", "Empathetic, hands-on problem solvers", "Those drawn to rehabilitation technology"],
    workNature: { description: "Evaluate patient needs, design custom prosthetic/orthotic devices, fit them and provide follow-up care.", examples: ["Evaluating patient mobility needs", "Designing custom devices with CAD/CAM", "Fitting and aligning prostheses/orthoses"] },
    eligibility: ["B.P.O. (Bachelor of Prosthetics and Orthotics)", "M.P.O. or Master's in Rehabilitation for advancement", "RCI registration"],
    stats: { salary: { entry: "3.5-6 LPA", median: "7-13 LPA", senior: "15-28 LPA", currency: "INR" }, jobGrowth: "+16%", demandLevel: "High", topIndustries: ["Rehab Centres", "Hospitals", "P&O Clinics", "NGOs (Jaipur Foot etc.)"], futureOutlook: "Rising diabetes-related amputations and road trauma sustain strong demand for P&O professionals; 3D printing is modernising the field." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.P.O.", description: "4-year Bachelor of Prosthetics and Orthotics (RCI recognised)." }, { title: "M.P.O. / Specialisation", description: "Master's for clinical and research roles." }] }],
    conventionalOptions: [{ title: "P&O at rehab centres", description: "Clinical prosthetic/orthotic practice." }],
    newAgeOptions: [{ title: "3D-Printed Prosthetics Specialist", description: "Additive manufacturing for custom devices." }],
    aiRelatedOptions: [{ title: "Biomechanics Data Analyst", description: "AI-assisted gait and fit optimisation." }],
    videoRecommendations: [],
    seo: { title: "Prosthetist & Orthotist Career in India: BPO Course, Salary & Scope", description: "Prosthetist & Orthotist career guide for India — BPO course, salary and rehabilitation technology careers.", keywords: ["prosthetist career India", "orthotist salary", "BPO course"], faqs: [{ question: "How to become a prosthetist in India?", answer: "Complete B.P.O. from an RCI-recognised institute, then pursue M.P.O. for advanced roles." }] },
    cat: "Healthcare & Medicine", sub: "Daily-living Rehabilitation",
    tech: ["Prosthetic Design & Fabrication", "Orthotic Design & Fabrication", "Patient Casting & Measurement", "Gait Analysis", "Material Science (Carbon Fibre, Thermoplastics)"],
    soft: ["Patient Empathy", "Creative Problem Solving", "Interdisciplinary Communication"],
    int: ["Restoring mobility", "Custom device fabrication", "Biomechanics"],
    per: ["Precise", "Innovative", "Patient"],
    deg: ["B.P.O. (Bachelor of Prosthetics and Orthotics)", "M.P.O. / Master's in Rehabilitation"],
    subj: ["Biology", "Physics", "Chemistry"],
    tools: ["CAD/CAM Systems", "3D Printing", "Lamination Equipment", "Gait Analysis Lab"],
    acts: ["Evaluating patient needs", "Designing custom prostheses/orthoses", "Fitting and aligning devices", "Providing follow-up care"],
    env: "Rehab centres, hospitals, prosthetic-orthotic clinics and NGOs",
    path: ["Prosthetist/Orthotist", "Senior Clinician", "Clinic Manager", "Rehabilitation Technology Lead"],
    auto: "Low", ind: "High", glo: "Medium", rem: "Low",
    rel: ["Physiotherapy", "Occupational Therapy", "Orthopaedic Surgery"],
    minEdu: "Bachelor's",
  },
  {
    name: "Respiratory Therapist",
    title: "Respiratory Therapist",
    introduction: "Respiratory Therapists manage breathing and airway care for critically ill patients — operating ventilators in ICUs, performing intubation assistance and running pulmonary rehabilitation programmes.",
    whoShouldPursue: ["Students interested in critical care and life support", "Calm, technically precise individuals", "Those drawn to ICU and emergency medicine"],
    workNature: { description: "Manage ventilated patients, perform airway interventions and run pulmonary function labs.", examples: ["Managing mechanical ventilation", "Performing airway management", "Running pulmonary function tests"] },
    eligibility: ["B.Sc Respiratory Therapy / Respiratory Care", "M.Sc Respiratory Therapy for senior roles", "Certification in ventilator management"],
    stats: { salary: { entry: "3.5-6 LPA", median: "7-14 LPA", senior: "15-30 LPA", currency: "INR" }, jobGrowth: "+20%", demandLevel: "High", topIndustries: ["Hospitals (ICU/ER)", "Pulmonary Labs", "Home Care", "Medical Device Companies"], futureOutlook: "Post-COVID, ICU capacity and ventilator expertise are national priorities — respiratory therapists are in acute shortage." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.Sc Respiratory Therapy", description: "Bachelor's in respiratory care/therapy." }, { title: "M.Sc / Specialisation", description: "Master's for ICU leadership roles." }] }],
    conventionalOptions: [{ title: "ICU Respiratory Therapist", description: "Ventilator and airway management." }],
    newAgeOptions: [{ title: "Home Ventilation Specialist", description: "Chronic respiratory home care." }],
    aiRelatedOptions: [{ title: "Ventilator Data Analyst", description: "AI-assisted ventilation optimisation." }],
    videoRecommendations: [],
    seo: { title: "Respiratory Therapist Career in India: Courses, Salary & Scope", description: "Respiratory therapist career guide for India — BSc courses, salary and ICU careers.", keywords: ["respiratory therapist India", "respiratory therapy salary", "BSc respiratory"], faqs: [{ question: "How to become a respiratory therapist?", answer: "Complete B.Sc in Respiratory Therapy, then specialise for ICU and senior roles." }] },
    cat: "Healthcare & Medicine", sub: "Hospital Operations",
    tech: ["Mechanical Ventilation Management", "Airway Management", "Arterial Blood Gas Analysis", "Pulmonary Function Testing", "Non-invasive Ventilation (BiPAP/CPAP)"],
    soft: ["Crisis Calmness", "Patient Advocacy", "Technical Precision"],
    int: ["Respiratory critical care", "Ventilator management", "Patient recovery"],
    per: ["Composed", "Detail-oriented", "Compassionate"],
    deg: ["B.Sc Respiratory Therapy / Respiratory Care", "M.Sc Respiratory Therapy"],
    subj: ["Biology", "Physics", "Chemistry"],
    tools: ["Ventilators", "Blood Gas Analysers", "Pulmonary Function Machines", "Airway Equipment"],
    acts: ["Managing ventilated patients", "Performing intubation assistance", "Running pulmonary rehab", "Monitoring ICU respiratory status"],
    env: "ICUs, emergency departments, pulmonary labs and home care; shift work",
    path: ["Respiratory Therapist", "Senior Therapist", "ICU Lead", "Respiratory Care Manager"],
    auto: "Low", ind: "High", glo: "High", rem: "Low",
    rel: ["Nursing", "Medicine", "Anaesthesiology"],
    minEdu: "Bachelor's",
  },
  {
    name: "Podiatrist",
    title: "Podiatrist",
    introduction: "Podiatrists diagnose and treat foot and ankle conditions — from diabetic ulcers and sports injuries to biomechanical gait disorders — preventing amputations and restoring mobility.",
    whoShouldPursue: ["Students interested in foot health and biomechanics", "Detail-oriented, patient-focused individuals", "Those drawn to diabetic and sports care"],
    workNature: { description: "Diagnose foot conditions, perform minor surgeries, prescribe orthotics and manage diabetic foot clinics.", examples: ["Diagnosing foot conditions", "Performing minor foot surgeries", "Managing diabetic foot care"] },
    eligibility: ["B.Podiatry / Bachelor of Podiatric Medicine (international programs)", "M.Podiatry or DPM for advanced practice", "Registration where applicable"],
    stats: { salary: { entry: "4-7 LPA", median: "8-16 LPA", senior: "18-35 LPA", currency: "INR" }, jobGrowth: "+14%", demandLevel: "Medium", topIndustries: ["Podiatry Clinics", "Diabetic Centres", "Sports Clinics", "Hospital Foot Clinics"], futureOutlook: "India's diabetes burden drives growing diabetic foot clinic demand; podiatry is an emerging speciality in metros." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.Podiatry / Life Sciences", description: "Bachelor's in podiatry or life sciences." }, { title: "M.Podiatry / DPM", description: "Master's or Doctor of Podiatric Medicine." }] }],
    conventionalOptions: [{ title: "Podiatrist at clinics", description: "Foot and ankle clinical care." }],
    newAgeOptions: [{ title: "Diabetic Foot Specialist", description: "Specialised diabetic limb preservation." }],
    aiRelatedOptions: [{ title: "Gait Analysis Specialist", description: "AI-assisted biomechanical assessment." }],
    videoRecommendations: [],
    seo: { title: "Podiatrist Career in India: Courses, Salary & Scope", description: "Podiatrist career guide for India — courses, salary and foot care careers.", keywords: ["podiatrist career India", "podiatry salary", "how to become podiatrist"], faqs: [{ question: "How to become a podiatrist?", answer: "Pursue podiatry education (B.Podiatry/M.Podiatry) or related life-sciences degrees with foot-care specialisation." }] },
    cat: "Healthcare & Medicine", sub: "Daily-living Rehabilitation",
    tech: ["Foot & Ankle Assessment", "Biomechanical Gait Analysis", "Orthotic Prescription", "Nail & Skin Surgery", "Diabetic Foot Management"],
    soft: ["Patient Communication", "Precision", "Multidisciplinary Coordination"],
    int: ["Foot health", "Mobility restoration", "Diabetic care"],
    per: ["Precise", "Patient", "Holistic"],
    deg: ["B.Podiatry / Bachelor of Podiatric Medicine (international)", "M.Podiatry or DPM (Doctor of Podiatric Medicine)"],
    subj: ["Biology", "Chemistry", "Physics"],
    tools: ["Gait Analysis Systems", "Orthotic Fabrication Equipment", "Diagnostic Imaging", "Surgical Instruments"],
    acts: ["Diagnosing foot conditions", "Performing minor surgeries", "Prescribing orthotics", "Managing diabetic foot clinics"],
    env: "Podiatry clinics, hospital foot clinics, diabetic centres and sports clinics",
    path: ["Junior Podiatrist", "Podiatrist", "Senior Podiatrist", "Clinical Lead / Clinic Owner"],
    auto: "Low", ind: "Medium", glo: "High", rem: "Low",
    rel: ["Orthopaedic Surgery", "Physiotherapy", "Diabetes Care"],
    minEdu: "Professional Degree",
  },
  {
    name: "Sonographer",
    title: "Sonographer",
    introduction: "Sonographers use ultrasound technology to create diagnostic images — scanning pregnancies, abdomens, hearts and blood vessels to help doctors make critical clinical decisions.",
    whoShouldPursue: ["Students interested in diagnostic imaging without radiation", "Patient, detail-oriented individuals", "Those drawn to obstetric and medical imaging"],
    workNature: { description: "Perform ultrasound scans, interpret images and document findings for radiologists and clinicians.", examples: ["Performing obstetric ultrasound", "Scanning abdominal and vascular structures", "Documenting diagnostic findings"] },
    eligibility: ["B.Sc Medical Imaging Technology / Medical Lab Technology", "PG Diploma in Medical Ultrasound", "M.Sc Medical Imaging for senior roles"],
    stats: { salary: { entry: "3.5-6 LPA", median: "7-13 LPA", senior: "14-28 LPA", currency: "INR" }, jobGrowth: "+18%", demandLevel: "High", topIndustries: ["Hospitals", "Diagnostic Centres", "Obstetric Clinics", "Radiology Departments"], futureOutlook: "Ultrasound is the most accessible imaging modality — sonographers are in steady demand across diagnostic chains and hospitals." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.Sc Medical Imaging", description: "Bachelor's in medical imaging technology." }, { title: "PG Diploma in Ultrasound", description: "Specialised ultrasound training." }] }],
    conventionalOptions: [{ title: "Sonographer at hospitals", description: "Diagnostic ultrasound imaging." }],
    newAgeOptions: [{ title: "Fetal Medicine Sonographer", description: "Advanced obstetric ultrasound specialist." }],
    aiRelatedOptions: [{ title: "AI Ultrasound Analyst", description: "AI-assisted image interpretation." }],
    videoRecommendations: [],
    seo: { title: "Sonographer Career in India: Ultrasound Courses, Salary & Scope", description: "Sonographer career guide for India — ultrasound courses, salary and medical imaging careers.", keywords: ["sonographer career India", "ultrasound technician salary", "how to become sonographer"], faqs: [{ question: "How to become a sonographer?", answer: "Complete B.Sc in Medical Imaging Technology and obtain ultrasound specialisation via diploma or master's." }] },
    cat: "Healthcare & Medicine", sub: "Medical Imaging",
    tech: ["Obstetric & Gynaecologic Ultrasound", "Abdominal & Vascular Ultrasound", "Echocardiography Basics", "Doppler Imaging", "Ultrasound Physics & Safety"],
    soft: ["Patient Communication", "Image Interpretation", "Attention to Detail"],
    int: ["Diagnostic imaging", "Fetal development", "Non-invasive assessment"],
    per: ["Patient", "Precise", "Observant"],
    deg: ["B.Sc Medical Imaging Technology / Sonography", "PG Diploma in Medical Ultrasound", "M.Sc Medical Imaging"],
    subj: ["Physics", "Biology", "Mathematics"],
    tools: ["Ultrasound Machines", "Transducers (Probes)", "PACS Systems", "Doppler Units"],
    acts: ["Performing ultrasound scans", "Interpreting images", "Documenting findings", "Ensuring patient comfort"],
    env: "Hospitals, diagnostic centres, obstetric clinics and radiology departments",
    path: ["Sonographer", "Senior Sonographer", "Imaging Lead", "Ultrasound Department Head"],
    auto: "Low", ind: "High", glo: "High", rem: "Low",
    rel: ["Radiology Technology", "Obstetrics", "Cardiology"],
    minEdu: "Bachelor's",
  },
  {
    name: "Phlebotomist",
    title: "Phlebotomist",
    introduction: "Phlebotomists draw blood and collect diagnostic samples — the critical first step in laboratory diagnosis. They combine technical precision with patient comfort skills.",
    whoShouldPursue: ["Students who want quick entry into healthcare", "Patient, precise individuals comfortable with clinical work", "Those interested in laboratory diagnostics"],
    workNature: { description: "Draw blood samples, process specimens and ensure accurate labelling and chain of custody.", examples: ["Performing venipuncture", "Processing and labelling samples", "Ensuring patient comfort"] },
    eligibility: ["DMLT / B.Sc MLT + phlebotomy certification", "Short-term phlebotomy certificate programs", "10+2 with science for entry-level roles"],
    stats: { salary: { entry: "2-3.5 LPA", median: "3.5-5.5 LPA", senior: "6-10 LPA", currency: "INR" }, jobGrowth: "+16%", demandLevel: "High", topIndustries: ["Hospitals", "Diagnostic Labs", "Blood Banks", "Mobile Collection Units"], futureOutlook: "Diagnostic chain expansion (Dr Lal PathLabs, Thyrocare) sustains steady phlebotomist demand; the role is the gateway to MLT careers." },
    pathways: [{ name: "Academic Route", steps: [{ title: "DMLT / Certificate", description: "Diploma or certificate in phlebotomy / MLT." }, { title: "B.Sc MLT", description: "Bachelor's for career progression to lab technologist." }] }],
    conventionalOptions: [{ title: "Phlebotomist at labs", description: "Sample collection for diagnostics." }],
    newAgeOptions: [{ title: "Mobile Collection Specialist", description: "Home sample collection services." }],
    aiRelatedOptions: [{ title: "Collection Operations Analyst", description: "Optimising sample logistics with data." }],
    videoRecommendations: [],
    seo: { title: "Phlebotomist Career in India: Courses, Salary & Scope", description: "Phlebotomist career guide for India — DMLT courses, salary and diagnostic careers.", keywords: ["phlebotomist career India", "phlebotomy salary", "how to become phlebotomist"], faqs: [{ question: "How to become a phlebotomist?", answer: "Complete DMLT or a phlebotomy certificate, then join diagnostic labs or hospitals." }] },
    cat: "Healthcare & Medicine", sub: "Laboratory Diagnostics",
    tech: ["Venipuncture Techniques", "Capillary Blood Collection", "Sample Labelling & Processing", "Infection Control", "Patient Identification"],
    soft: ["Patient Comfort", "Precision", "Calm Under Pressure"],
    int: ["Diagnostic sample collection", "Patient interaction", "Lab quality"],
    per: ["Gentle", "Precise", "Reliable"],
    deg: ["B.Sc Medical Laboratory Technology (MLT) / DMLT + phlebotomy certification", "Short-term phlebotomy certificate programs"],
    subj: ["Biology", "Chemistry"],
    tools: ["Vacutainer Systems", "Butterfly Needles", "Sample Transport Containers", "LIS Software"],
    acts: ["Drawing blood samples", "Processing specimens", "Ensuring patient comfort", "Maintaining chain of custody"],
    env: "Hospitals, diagnostic labs, blood banks and mobile collection units",
    path: ["Phlebotomist", "Senior Phlebotomist", "Collection Supervisor", "Lab Collection Manager"],
    auto: "Low", ind: "High", glo: "High", rem: "Low",
    rel: ["Medical Laboratory Sciences", "Nursing", "Clinical Research"],
    minEdu: "Diploma",
  },
  {
    name: "Biomedical Scientist",
    title: "Biomedical Scientist",
    introduction: "Biomedical Scientists investigate disease mechanisms at the cellular and molecular level — running experiments, analysing data and advancing therapeutic discoveries in labs across academia and industry.",
    whoShouldPursue: ["Students passionate about lab research and discovery", "Analytical, curious minds who love experiments", "Those aiming for research and biotech careers"],
    workNature: { description: "Run biomedical experiments, analyse data, write papers and present findings.", examples: ["Running cell and molecular experiments", "Analysing biomedical data", "Publishing research findings"] },
    eligibility: ["B.Sc Biomedical Science / Life Sciences", "M.Sc Biomedical Science / Biotechnology", "PhD for principal investigator roles"],
    stats: { salary: { entry: "4-7 LPA", median: "9-18 LPA", senior: "20-45 LPA", currency: "INR" }, jobGrowth: "+18%", demandLevel: "High", topIndustries: ["Research Institutes", "Biotech/Pharma", "University Labs", "Hospitals (Research)"], futureOutlook: "Biotech and pharma R&D investment in India is growing rapidly; biomedical scientists are core to drug discovery pipelines." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.Sc Biomedical Science", description: "Bachelor's in biomedical or life sciences." }, { title: "M.Sc + Research", description: "Master's followed by research experience or PhD." }] }],
    conventionalOptions: [{ title: "Research Scientist at institutes", description: "Lab-based biomedical research." }],
    newAgeOptions: [{ title: "Translational Research Scientist", description: "Bench-to-bedside therapeutic research." }],
    aiRelatedOptions: [{ title: "Bioinformatics-Enabled Scientist", description: "AI-assisted biomedical data analysis." }],
    videoRecommendations: [],
    seo: { title: "Biomedical Scientist Career in India: Courses, Salary & Scope", description: "Biomedical scientist career guide for India — BSc courses, salary and research careers.", keywords: ["biomedical scientist India", "biomedical science salary", "how to become biomedical scientist"], faqs: [{ question: "How to become a biomedical scientist?", answer: "Complete B.Sc in Biomedical Science or life sciences, then M.Sc and research experience; PhD for leadership roles." }] },
    cat: "Life Sciences", sub: "Biotechnology",
    tech: ["Cell Culture", "Molecular Biology (PCR, qPCR)", "Flow Cytometry", "Protein Analysis (Western Blot)", "Microscopy & Imaging"],
    soft: ["Scientific Rigour", "Data Analysis", "Collaboration"],
    int: ["Disease mechanisms", "Therapeutic discovery", "Lab research"],
    per: ["Curious", "Analytical", "Persistent"],
    deg: ["B.Sc Biomedical Science / Life Sciences", "M.Sc Biomedical Science / Biotechnology (PhD for research lead)"],
    subj: ["Biology", "Chemistry", "Statistics"],
    tools: ["Biosafety Cabinets", "PCR Machines", "Flow Cytometers", "Imaging Systems", "Statistical Software"],
    acts: ["Running experiments", "Analysing data", "Writing research papers", "Presenting at conferences"],
    env: "Research institutes, biotech/pharma companies and university labs",
    path: ["Research Assistant", "Research Scientist", "Senior Scientist", "Principal Investigator / Lab Head"],
    auto: "Low", ind: "High", glo: "High", rem: "Low",
    rel: ["Biotechnology Research", "Genetics", "Clinical Research"],
    minEdu: "Master's",
  },
  {
    name: "Epidemiologist",
    title: "Epidemiologist",
    introduction: "Epidemiologists study how diseases spread through populations — designing studies, analysing outbreak data and advising governments on evidence-based public health policy.",
    whoShouldPursue: ["Students who love statistics and population health", "Analytical minds drawn to outbreak investigation", "Those wanting policy impact at scale"],
    workNature: { description: "Design epidemiological studies, analyse disease data, investigate outbreaks and advise on policy.", examples: ["Designing population health studies", "Analysing disease surveillance data", "Investigating outbreaks"] },
    eligibility: ["MBBS/BDS/Health degree + MPH (Epidemiology)", "M.Sc Epidemiology / Biostatistics", "PhD for research leadership"],
    stats: { salary: { entry: "6-10 LPA", median: "12-22 LPA", senior: "25-50 LPA", currency: "INR" }, jobGrowth: "+22%", demandLevel: "High", topIndustries: ["Government Health Agencies", "WHO/UNICEF", "Research Institutes", "Pharma/Academic"], futureOutlook: "Post-COVID, epidemiological surveillance capacity is a national priority; epidemiologists are sought by government, global agencies and research." },
    pathways: [{ name: "Academic Route", steps: [{ title: "Health/Life Sciences Degree", description: "MBBS, BDS, B.Sc Life Sciences or related." }, { title: "MPH / M.Sc Epidemiology", description: "Master's in epidemiology or biostatistics." }, { title: "PhD (optional)", description: "Doctoral training for research leadership." }] }],
    conventionalOptions: [{ title: "Epidemiologist at health agencies", description: "Disease surveillance and outbreak response." }],
    newAgeOptions: [{ title: "Digital Epidemiology Specialist", description: "Real-time digital surveillance systems." }],
    aiRelatedOptions: [{ title: "AI Outbreak Prediction Analyst", description: "Machine learning for epidemic forecasting." }],
    videoRecommendations: [],
    seo: { title: "Epidemiologist Career in India: MPH, Salary & Scope", description: "Epidemiologist career guide for India — MPH courses, salary and disease surveillance careers.", keywords: ["epidemiologist career India", "epidemiology salary", "how to become epidemiologist"], faqs: [{ question: "How to become an epidemiologist?", answer: "Complete a health or life-sciences degree, then MPH or M.Sc in Epidemiology/Biostatistics; PhD for research roles." }] },
    cat: "Healthcare & Medicine", sub: "Community Health",
    tech: ["Epidemiological Study Design", "Statistical Modelling (R/SAS/Stata)", "Surveillance Systems", "Outbreak Investigation", "Health Data Analysis"],
    soft: ["Critical Thinking", "Communication", "Policy Translation"],
    int: ["Disease patterns", "Population health", "Evidence-based policy"],
    per: ["Analytical", "Mission-driven", "Rigorous"],
    deg: ["MBBS/BDS/Health degree + MPH (Epidemiology)", "M.Sc Epidemiology / Biostatistics", "PhD for research roles"],
    subj: ["Biology", "Statistics", "Mathematics"],
    tools: ["Epi Info", "R/SAS/Stata", "GIS (ArcGIS/QGIS)", "DHIS2"],
    acts: ["Designing studies", "Analysing disease data", "Investigating outbreaks", "Advising on public health policy"],
    env: "Government health agencies, WHO/UNICEF, research institutes and NGOs; field and office work",
    path: ["Epidemiology Officer", "Epidemiologist", "Senior Epidemiologist", "Director of Epidemiology / Surveillance"],
    auto: "Low", ind: "High", glo: "High", rem: "Medium",
    rel: ["Public Health", "Biostatistics", "Clinical Research"],
    minEdu: "Master's",
  },
  {
    name: "Health Educator",
    title: "Health Educator",
    introduction: "Health Educators empower communities to make healthier choices — designing health campaigns, running workshops and training peer educators to prevent disease and promote wellness.",
    whoShouldPursue: ["Students passionate about community health and prevention", "Engaging communicators who love field work", "Those drawn to social impact in healthcare"],
    workNature: { description: "Design health education campaigns, run community workshops, train peer educators and evaluate programme impact.", examples: ["Designing health campaigns", "Running community workshops", "Evaluating programme impact"] },
    eligibility: ["B.Sc Public Health / Health Education", "MPH / M.Sc Health Promotion", "CHES certification where available"],
    stats: { salary: { entry: "3-6 LPA", median: "6-12 LPA", senior: "12-25 LPA", currency: "INR" }, jobGrowth: "+16%", demandLevel: "High", topIndustries: ["Government Health Missions", "NGOs", "Schools/Corporate Wellness", "International Agencies"], futureOutlook: "Preventive health and community outreach are expanding under Ayushman Bharat and NGO programmes; health educators are needed across districts." },
    pathways: [{ name: "Academic Route", steps: [{ title: "B.Sc Public Health", description: "Bachelor's in public health or health education." }, { title: "MPH / M.Sc", description: "Master's in health promotion or public health." }] }],
    conventionalOptions: [{ title: "Health Educator at NGOs", description: "Community health education programmes." }],
    newAgeOptions: [{ title: "Digital Health Educator", description: "Online health literacy and behaviour change campaigns." }],
    aiRelatedOptions: [{ title: "Health Communication Data Analyst", description: "Data-driven campaign targeting and evaluation." }],
    videoRecommendations: [],
    seo: { title: "Health Educator Career in India: Courses, Salary & Scope", description: "Health educator career guide for India — courses, salary and community health careers.", keywords: ["health educator career India", "health education salary", "how to become health educator"], faqs: [{ question: "How to become a health educator?", answer: "Complete B.Sc in Public Health or health education, then MPH or M.Sc in Health Promotion for advancement." }] },
    cat: "Healthcare & Medicine", sub: "Community Health",
    tech: ["Health Education Curriculum Design", "Behaviour Change Theory", "Community Mobilisation", "Programme Monitoring & Evaluation", "Health Communication"],
    soft: ["Cultural Sensitivity", "Facilitation", "Empathy"],
    int: ["Health promotion", "Community empowerment", "Preventive health"],
    per: ["Engaging", "Patient", "Mission-driven"],
    deg: ["B.Sc Public Health / Health Education", "MPH / M.Sc Health Promotion", "CHES / Certified Health Education Specialist"],
    subj: ["Biology", "Psychology", "Social Science"],
    tools: ["IEC Materials", "Survey Tools", "Digital Health Platforms", "Community Meeting Spaces"],
    acts: ["Designing health campaigns", "Running community workshops", "Training peer educators", "Evaluating programme impact"],
    env: "Government health missions, NGOs, schools, corporate wellness and international agencies; field and community work",
    path: ["Health Educator", "Senior Health Educator", "Programme Manager", "Health Promotion Director"],
    auto: "Low", ind: "High", glo: "Medium", rem: "Medium",
    rel: ["Public Health", "Social Work and Development Sector", "Nursing"],
    minEdu: "Bachelor's",
  },
];

async function main() {
  console.log(`Upserting ${careers.length} medical careers...`);
  let created = 0, updated = 0;
  for (const c of careers) {
    const slug = slugify(c.name);
    const data = {
      name: c.name, slug, title: c.title, category: c.cat, subcategory: c.sub,
      shortDescription: c.introduction.split(".")[0].slice(0, 180),
      introduction: c.introduction, whoShouldPursue: c.whoShouldPursue, eligibility: c.eligibility,
      workNatureDesc: c.workNature.description, workNatureExamples: c.workNature.examples,
      demandLevel: c.stats.demandLevel, salaryCurrency: c.stats.salary.currency,
      salaryEntry: c.stats.salary.entry, salaryMedian: c.stats.salary.median || null, salarySenior: c.stats.salary.senior,
      jobGrowth: c.stats.jobGrowth, topIndustries: c.stats.topIndustries, futureOutlook: c.stats.futureOutlook,
      minStudyLevel: c.minEdu, technicalSkills: c.tech, softSkills: c.soft, interests: c.int,
      personalityTraits: c.per, recommendedDegrees: c.deg, recommendedSubjects: c.subj,
      toolsAndTechnologies: c.tools, workActivities: c.acts, workEnvironment: c.env,
      careerPath: c.path, automationRisk: c.auto, indiaRelevance: c.ind, globalRelevance: c.glo,
      remotePotential: c.rem, relatedCareers: c.rel, isEmerging: Boolean(c.emerging), isActive: true,
      seoTitle: c.seo.title, seoDescription: c.seo.description, seoKeywords: c.seo.keywords, faqs: c.seo.faqs,
      pathways: c.pathways, conventionalOptions: c.conventionalOptions, newAgeOptions: c.newAgeOptions,
      aiRelatedOptions: c.aiRelatedOptions, videoRecommendations: c.videoRecommendations,
    };
    const existing = await prisma.career.findUnique({ where: { name: c.name } });
    if (existing) { await prisma.career.update({ where: { id: existing.id }, data }); updated++; }
    else { await prisma.career.create({ data }); created++; }
  }
  console.log(`Careers: created ${created}, updated ${updated}`);

  // Derive traits from enrichment-like fields (same traitMap as seed-career-intelligence)
  const traitMap = {
    tech: { dimension: "SKILL", weight: 1 },
    soft: { dimension: "SKILL", weight: 0.5 },
    int: { dimension: "INTEREST", weight: 1 },
    per: { dimension: "PERSONALITY", weight: 1 },
    subj: { dimension: "SUBJECT", weight: 1 },
    deg: { dimension: "EDUCATION", weight: 1 },
  };
  let traitCount = 0;
  for (const c of careers) {
    const career = await prisma.career.findUnique({ where: { name: c.name } });
    if (!career) { console.warn(`  ! not found: ${c.name}`); continue; }
    await prisma.careerTrait.deleteMany({ where: { careerId: career.id } });
    const rows = [];
    for (const [field, cfg] of Object.entries(traitMap)) {
      for (const value of c[field] || []) {
        rows.push({ careerId: career.id, dimension: cfg.dimension, value: String(value).trim(), weight: cfg.weight });
      }
    }
    if (rows.length) { await prisma.careerTrait.createMany({ data: rows, skipDuplicates: true }); traitCount += rows.length; }
  }
  console.log(`Trait rows for new careers: ${traitCount}`);

  // Also run the regular enrichment for the 11 (they're now in enrichment-health-law.json)
  console.log("Running enrichment trait derivation for all careers...");
  const fs2 = await import("fs");
  const path2 = await import("path");
  const DATA_DIR = path.resolve(__dirname, "career-intelligence");
  const enrichment = {};
  for (const f of fs2.readdirSync(DATA_DIR)) {
    if (f.startsWith("enrichment-") && f.endsWith(".json")) {
      Object.assign(enrichment, JSON.parse(fs2.readFileSync(path.join(DATA_DIR, f), "utf8")));
    }
  }
  let enriched = 0;
  for (const [name, e] of Object.entries(enrichment)) {
    const career = await prisma.career.findUnique({ where: { name } });
    if (!career) continue;
    // Only re-derive for our 11 new careers (they were just created, but enrichment may have more complete data)
    if (!careers.some((cc) => cc.name === name)) continue;
    await prisma.careerTrait.deleteMany({ where: { careerId: career.id } });
    const rows = [];
    for (const [field, cfg] of Object.entries(traitMap)) {
      for (const value of e[field] || []) {
        rows.push({ careerId: career.id, dimension: cfg.dimension, value: String(value).trim(), weight: cfg.weight });
      }
    }
    if (rows.length) { await prisma.careerTrait.createMany({ data: rows, skipDuplicates: true }); }
    enriched++;
  }
  console.log(`Re-enriched ${enriched} careers from enrichment JSON`);

  const total = await prisma.career.count({ where: { isActive: true } });
  console.log(`Total active careers: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
