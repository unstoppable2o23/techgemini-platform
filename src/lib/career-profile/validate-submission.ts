import type { RawQuestion } from "../tests";

export type QuestionBank = Record<string, RawQuestion>;

export type SubmissionValidationResult =
  | { ok: true; answers: Record<string, string> }
  | { ok: false; error: string };

/**
 * Server-side validation of assessment answers against the authoritative
 * question bank. Never trusts client-provided scores or report values.
 * The bank is injected by the caller (keeps this module pure and testable).
 */
export function validateSubmission(
  bank: QuestionBank,
  raw: unknown
): SubmissionValidationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "answers must be an object mapping questionId to optionId" };
  }

  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length === 0) {
    return { ok: false, error: "answers cannot be empty" };
  }

  if (!bank || Object.keys(bank).length === 0) {
    return { ok: false, error: "Question bank is empty" };
  }

  const answers: Record<string, string> = {};

  for (const [questionId, optionValue] of entries) {
    if (typeof questionId !== "string" || questionId.trim() === "") {
      return { ok: false, error: "Question ids must be non-empty strings" };
    }
    const question: RawQuestion | undefined = bank[questionId];
    if (!question) {
      return { ok: false, error: `Unknown question id: ${questionId}` };
    }
    if (typeof optionValue !== "string" || optionValue.trim() === "") {
      return { ok: false, error: `Invalid option for question ${questionId}` };
    }
    const options = Object.values(question.options ?? {}).sort(
      (a, b) => Number(a.id) - Number(b.id)
    );
    const option = options.find((o) => String(o.id) === optionValue);
    if (!option) {
      return { ok: false, error: `Option ${optionValue} does not belong to question ${questionId}` };
    }
    answers[questionId] = optionValue;
  }

  return { ok: true, answers };
}

export function isFullyAnswered(
  bank: QuestionBank,
  answers: Record<string, string>
): boolean {
  return Object.keys(bank).every((id) => Boolean(answers[id]));
}
