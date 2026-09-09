import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadAuthorizedStudent } from "@/lib/counselor/access.ts";
import { getStudent360 } from "@/lib/counselor/student360.ts";
import { Badge } from "@/components/ui/badge";
import { ATTENTION_LABELS } from "@/lib/counselor/attention";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function StudentReportPage({
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
  if (!auth.ok) redirect("/students");

  const data = await getStudent360(id, {
    counselorUserId: session.user.role === "COUNSELOR" ? session.user.id : undefined,
  });
  if (!data) redirect("/students");

  const primary = data.attention?.primary
    ? ATTENTION_LABELS[data.attention.primary] ?? data.attention.primary
    : "On track";
  const profile = data.profile ?? {};

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Advisor report · {new Date().toLocaleDateString()}
          </p>
          <h1 className="text-2xl font-bold">
            {data.user.firstName} {data.user.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{data.user.email}</p>
        </div>
        <PrintButton />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4 print:grid-cols-4">
        {[
          ["Profile completeness", `${Math.round(data.careerProfile?.completeness ?? 0)}%`],
          ["Assessments", `${data.assessmentCompletedCount}/${data.assessmentTotal}`],
          ["Journey", data.journey ? `${data.journey.percentComplete}%` : "—"],
          ["Attention", primary],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <Section title="Profile">
        <Grid
          items={[
            ["Grade / Study level", `${profile.gradeLevel ?? "—"}${profile.studyLevel ? ` · ${profile.studyLevel}` : ""}`],
            ["Target country", profile.targetCountry ?? "—"],
            ["Highest education", profile.highestEducation ?? "—"],
            ["Preferred career", profile.preferredCareer ?? "—"],
            ["Budget", profile.tuitionBudget ?? "—"],
            ["Funding source", profile.fundingSource ?? "—"],
          ]}
        />
      </Section>

      <Section title="Career recommendations">
        {(data.careerMatches ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ol className="space-y-1 text-sm">
            {(data.careerMatches ?? []).slice(0, 3).map((m: any) => (
              <li key={m.careerId} className="flex justify-between border-b py-1">
                <span>{m.career.title || m.career.name}</span>
                <span className="text-muted-foreground">
                  {m.matchScore}% · conf {m.confidenceScore}%
                </span>
              </li>
            ))}
          </ol>
        )}
        {data.careerMatchDisclaimer && (
          <p className="mt-2 text-[11px] italic text-muted-foreground">{data.careerMatchDisclaimer}</p>
        )}
      </Section>

      <Section title="Counselor career decisions">
        {(data.careerDecisions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(data.careerDecisions ?? []).map((d: any) => (
              <li key={d.id} className="border-b py-1">
                {d.careerId}
                {d.selectedPathway && <Badge variant="success" className="ml-2">Selected pathway</Badge>}
                {d.shortlistedCareer && <Badge variant="secondary" className="ml-1">Shortlisted</Badge>}
                {d.followUpRequired && <Badge variant="warning" className="ml-1">Follow-up required</Badge>}
                {d.counselorRecommendation && (
                  <p className="text-xs text-muted-foreground">{d.counselorRecommendation}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Program planning">
        {(data.programPlans ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">None recorded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(data.programPlans ?? []).map((p: any) => (
              <li key={p.id} className="border-b py-1 flex flex-wrap gap-1">
                <span>{p.programId}</span>
                {p.shortlisted && <Badge variant="secondary">Shortlisted</Badge>}
                {p.requiresResearch && <Badge variant="warning">Needs research</Badge>}
                {p.studentInterested && <Badge>Student interested</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Action plan">
        {(data.actions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(data.actions ?? []).map((a: any) => (
              <li key={a.id} className="border-b py-1 flex items-center justify-between">
                <span className={a.completed ? "line-through text-muted-foreground" : ""}>
                  {a.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "No due date"}
                  {" · "}{a.completed ? "done" : "open"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Counselor notes">
        {(data.notes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(data.notes ?? []).map((n: any) => (
              <li key={n.id} className="border-b py-1">
                {n.content}
                <p className="text-[11px] text-muted-foreground">
                  {n.type?.toLowerCase()} · {new Date(n.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="mt-8 text-center text-[10px] text-muted-foreground">
        Generated from the TechGemini counselor workspace. This report reflects current saved data and
        counselor advisories; it is guidance context, not an academic guarantee.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 overflow-hidden rounded-xl border bg-card p-4">{children}</div>
    </div>
  );
}

function Grid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b py-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}