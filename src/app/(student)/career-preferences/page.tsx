import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CareerPreferencesEditor } from "./career-preferences-editor";

export default async function CareerPreferencesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "STUDENT") redirect("/dashboard");

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      targetColleges: true,
      targetCountries: true,
      preferredCareer: true,
      prospectiveSessions: true,
      nationality: true,
      state: true,
      hasEnglishResult: true,
      englishTestType: true,
      englishTestScore: true,
      englishProficiency: true,
      tuitionBudget: true,
      fundingSource: true,
      preferredIntake: true,
      preferredYear: true,
      highestEducation: true,
      averageGrade: true,
      careerPlanNotes: true,
      careerPrefsFilled: true,
    },
  });

  const initial = {
    targetColleges: profile?.targetColleges || [],
    collegeNotFinalized: profile?.careerPrefsFilled ? profile.targetColleges.length === 0 : false,
    nationality: profile?.nationality || "",
    state: profile?.state || "",
    hasEnglishResult: profile?.hasEnglishResult ?? false,
    englishTestType: profile?.englishTestType || "",
    englishTestScore: profile?.englishTestScore || "",
    englishProficiency: profile?.englishProficiency || "",
    tuitionBudget: profile?.tuitionBudget || "",
    fundingSource: profile?.fundingSource || "",
    targetCountries: profile?.targetCountries || [],
    countryNotFinalized: profile?.careerPrefsFilled ? profile.targetCountries.length === 0 : false,
    preferredCareer: profile?.preferredCareer || "",
    careerNotFinalized: profile?.careerPrefsFilled ? !profile.preferredCareer : false,
    prospectiveSessions: profile?.prospectiveSessions || [],
    preferredIntake: profile?.preferredIntake || "",
    preferredYear: profile?.preferredYear || "",
    highestEducation: profile?.highestEducation || "",
    averageGrade: profile?.averageGrade || "",
    careerPlanNotes: profile?.careerPlanNotes || "",
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-3xl space-y-6">
        <CareerPreferencesEditor
          title={profile?.careerPrefsFilled ? "Edit your Career Preferences" : "Tell us about your Career Preferences"}
          description="Your career preferences help us provide you with the most relevant and updated information!"
          initial={initial}
          isNew={!profile?.careerPrefsFilled}
        />
      </div>
    </div>
  );
}