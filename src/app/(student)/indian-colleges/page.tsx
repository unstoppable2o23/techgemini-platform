import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import IndianCollegesClient from "./indian-colleges-client";

export default async function IndianCollegesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");

  return <IndianCollegesClient role={session.user.role} />;
}
