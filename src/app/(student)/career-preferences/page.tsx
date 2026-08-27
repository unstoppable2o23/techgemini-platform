import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentOnboardingFlow } from "@/components/career-preferences/student-onboarding-flow";

export default async function CareerPreferencesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      dateOfBirth: true,
      mobile: true,
      gender: true,
      gradeLevel: true,
      studyLevel: true,
      exams: true,
      subjectsStudied: true,
      subjectsEnjoyed: true,
      activityInterests: true,
      nationality: true,
      state: true,
      hasEnglishResult: true,
      englishTestType: true,
      englishTestScore: true,
      englishProficiency: true,
      tuitionBudget: true,
      fundingSource: true,
      targetColleges: true,
      targetCountries: true,
      preferredCareer: true,
      prospectiveSessions: true,
      preferredIntake: true,
      preferredYear: true,
      highestEducation: true,
      averageGrade: true,
      careerPlanNotes: true,
      careerPrefsFilled: true,
    },
  });

  const filled = profile?.careerPrefsFilled ?? false;
  const initial = {
    targetColleges: profile?.targetColleges || [],
    collegeNotFinalized: filled ? (profile?.targetColleges?.length ?? 0) === 0 : false,
    nationality: profile?.nationality || "",
    state: profile?.state || "",
    hasEnglishResult: profile?.hasEnglishResult ?? false,
    englishTestType: profile?.englishTestType || "",
    englishTestScore: profile?.englishTestScore || "",
    englishProficiency: profile?.englishProficiency || "",
    tuitionBudget: profile?.tuitionBudget || "",
    fundingSource: profile?.fundingSource || "",
    targetCountries: profile?.targetCountries || [],
    countryNotFinalized: filled ? (profile?.targetCountries?.length ?? 0) === 0 : false,
    preferredCareer: profile?.preferredCareer || "",
    careerNotFinalized: filled ? !profile?.preferredCareer : false,
    prospectiveSessions: profile?.prospectiveSessions || [],
    preferredIntake: profile?.preferredIntake || "",
    preferredYear: profile?.preferredYear || "",
    highestEducation: profile?.highestEducation || "",
    averageGrade: profile?.averageGrade || "",
    careerPlanNotes: profile?.careerPlanNotes || "",
    gradeLevel: profile?.gradeLevel || "",
    studyLevel: profile?.studyLevel || "",
    exams: profile?.exams || [],
    subjectsStudied: profile?.subjectsStudied || [],
    subjectsEnjoyed: profile?.subjectsEnjoyed || [],
    activityInterests: profile?.activityInterests || [],
    mobile: profile?.mobile || "",
    gender: profile?.gender || "",
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : "",
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-6">
        <StudentOnboardingFlow initial={initial} isNew={!filled} />
      </div>
    </div>
  );
}
