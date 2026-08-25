import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Trophy } from "lucide-react";

export default async function ScholarshipsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/auth/login");
  const user = session.user;
  if (user.role !== "STUDENT") redirect("/auth/login");

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
    include: { featureAccess: true },
  });

  if (!studentProfile?.featureAccess?.scholarshipHub) redirect("/dashboard");

  return (
    <div className="p-6 pt-20 space-y-6">
      <PageHeader icon={Trophy} title="Scholarships" description="Find scholarships and funding opportunities" eyebrow="Student Tools" />
      <Card>
        <CardHeader><CardTitle>Scholarship Hub</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Scholarship search coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
