import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getMedicalDisciplineForCareerName,
  getMedicalDisciplineForCareerSlug,
} from "@/lib/medical-education/registry";
import CareerDetailClient from "./career-detail-client";

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  const user = session.user;
  const isStaff = user.role === "COUNSELOR" || user.role === "SUPER_ADMIN";
  if (!isStaff && user.role !== "STUDENT") redirect("/auth/login");

  if (!isStaff) {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { featureAccess: true },
    });
    if (!studentProfile?.featureAccess?.careerLibrary) redirect("/dashboard");
  }

  const career = await prisma.career.findUnique({ where: { slug } });
  if (!career) redirect("/career-library");

  // Phase 26 — this student's journey relationship to the career
  // (explored / shortlisted / preferred) so the detail page can show chips
  // and the "Build my pathway" CTA. Staff users get empty defaults.
  let journey = { explored: false, shortlisted: false, preferred: false };
  if (!isStaff) {
    const { assessCareerJourneyStates } = await import(
      "@/lib/student/journey-state.ts"
    );
    try {
      const states = await assessCareerJourneyStates(user!.id, [career.id]);
      journey = states[career.id] ?? journey;
    } catch {
      journey = { explored: false, shortlisted: false, preferred: false };
    }
  }

  // Phase 23.2 (Part B) — Medical Education Knowledge Layer. The registry is a
  // data-only module (no DB); its info is passed to the client so only medical
  // career pages pay the small payload cost.
  const discipline =
    getMedicalDisciplineForCareerName(career.name) ??
    getMedicalDisciplineForCareerSlug(career.slug) ??
    null;
  const medicalEducation = discipline
    ? {
        title: discipline.title,
        summary: discipline.summary,
        curriculumFacts: discipline.curriculumFacts,
        schoolSubjects: discipline.schoolSubjects,
        entrance: discipline.entrance,
        degree: discipline.degree,
        internshipTraining: discipline.internshipTraining,
        registration: discipline.registration,
        specialization: discipline.specialization,
        careerOptions: discipline.careerOptions,
        alternatives: discipline.alternatives,
        indiaAbroad: discipline.indiaAbroad,
        sources: discipline.sources,
      }
    : null;

  return (
    <CareerDetailClient
      career={career}
      medicalEducation={medicalEducation}
      journey={journey}
    />
  );
}
