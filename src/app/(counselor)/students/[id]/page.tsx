import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getStudent360 } from "@/lib/counselor/student360.ts";
import Student360Client from "./student-360-client";

export default async function Student360Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  if (session.user.role !== "COUNSELOR" && session.user.role !== "SUPER_ADMIN")
    redirect("/auth/login");

  const auth = await loadAuthorizedStudent(id, session);
  if (!auth.ok) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        You are not authorized to view this student, or the student was not found.
      </div>
    );
  }

  const data = await getStudent360(id, {
    counselorUserId:
      session.user.role === "COUNSELOR" ? session.user.id : undefined,
  });
  if (!data) redirect("/counselor/students");

  return (
    <Student360Client data={data} counselorUserId={session.user.id} />
  );
}
