import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CareerLibraryClient from "./career-library-client";

export default async function CareerLibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  const user = session.user;
  const isStaff = user.role === "COUNSELOR" || user.role === "SUPER_ADMIN";
  if (isStaff) return <CareerLibraryClient />;
  if (user.role !== "STUDENT") redirect("/auth/login");

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { featureAccess: true },
  });

  if (!studentProfile?.featureAccess?.careerLibrary) redirect("/dashboard");

  return <CareerLibraryClient />;
}
