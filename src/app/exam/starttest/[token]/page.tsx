import { kindForToken } from "@/lib/tests";
import { ExamClient } from "./exam-client";

export default async function StartTestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const kind = kindForToken(token);

  if (!kind) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-800">Invalid test link</h1>
        <p className="mt-2 text-sm text-slate-500">
          This link does not match any assigned test. Please ask your counselor for a
          valid link.
        </p>
      </div>
    );
  }

  return <ExamClient token={token} kind={kind} />;
}
