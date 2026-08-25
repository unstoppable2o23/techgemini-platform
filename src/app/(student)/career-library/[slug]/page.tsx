import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  return <CareerDetailClient career={career} />;
}
