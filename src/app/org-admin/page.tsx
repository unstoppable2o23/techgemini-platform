import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OrgAdminDashboardClient from "./org-admin-dashboard-client";

export default async function OrgAdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  if (session.user.role !== "ORGANIZATION_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return <OrgAdminDashboardClient />;
}