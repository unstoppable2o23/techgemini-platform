import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORIES = ["HELP", "PROBLEM", "CONTACT"] as const;

/**
 * POST — submit a support request / report a problem.
 * Authenticated (optionally captures organization + user). Does NOT require a
 * role: any signed-in user (admin/counselor/student) can reach support.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { category?: string; subject?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const category = (body.category ?? "").toUpperCase();
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "category must be HELP, PROBLEM or CONTACT" }, { status: 400 });
  }
  const subject = (body.subject ?? "").trim().slice(0, 200);
  const description = (body.description ?? "").trim().slice(0, 5000);
  if (!subject) {
    return NextResponse.json({ error: "A short subject is required" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      tenantId: session.user.tenantId as string,
      userId: session.user.id,
      category,
      subject,
      description: description || null,
    },
    select: { id: true, category: true, status: true, createdAt: true },
  });

  return NextResponse.json(
    {
      ticket,
      message:
        category === "PROBLEM"
          ? "Thanks for reporting this. Our team has been notified and will help you." +
            " You can reach us directly at support@techgemini (or your account manager) for urgent issues."
          : "Thanks for reaching out. We have received your request.",
    },
    { status: 201 }
  );
}
