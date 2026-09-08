import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordProductEvent, type ProductEventName } from "@/lib/analytics/record";

const ALLOWED: ProductEventName[] = [
  "recommendation_viewed",
  "career_detail_opened",
  "compare_opened",
  "program_explored",
  "university_explored",
  "profile_completion_cta_clicked",
  "assessment_cta_clicked",
];

// Payloads are explicitly capped and validated: only the event name + optional
// small career reference + tiny flat meta. Assessment answers are never
// accepted here by construction.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const body = await request.json();
    const event = body?.event;
    if (!ALLOWED.includes(event as ProductEventName)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const meta = body?.meta;
    const safeMeta =
      meta && typeof meta === "object" && !Array.isArray(meta)
        ? Object.fromEntries(
            Object.entries(meta).filter(
              ([k, v]) =>
                typeof k === "string" &&
                (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)
            )
          )
        : undefined;

    await recordProductEvent({
      userId: session.user.id,
      event: event as ProductEventName,
      careerId: typeof body?.careerId === "string" ? body.careerId : null,
      careerSlug: typeof body?.careerSlug === "string" ? body.careerSlug : null,
      careerName: typeof body?.careerName === "string" ? body.careerName : null,
      meta: safeMeta,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}