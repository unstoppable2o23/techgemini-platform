import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const TRIAL_DAYS = 14;

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "org";
}

/**
 * POST /api/commercial/trial — START TRIAL conversion path.
 *
 * Creates a new organization (Tenant) in TRIAL status with an ORGANIZATION_ADMIN
 * user and a TRIAL Subscription, so the org admin can log in immediately and run
 * the §13 sales workflow. No payment gateway. Existing data is never touched.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(`trial:${clientIp(request)}`, 5, 600);
    if (!limited.ok) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (body._hp) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { orgName, contactName, contactEmail, contactPhone, firstName, lastName, email, password } = body;

    if (!orgName || !firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "orgName, contactName, email and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Unable to create account with these details" }, { status: 409 });
    }

    const slug = `${slugify(orgName)}-${Date.now().toString(36)}`;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const trialPlan = await prisma.subscriptionPlan.findUnique({ where: { planType: "TRIAL" } });
    if (!trialPlan) {
      return NextResponse.json({ error: "Trial plan is not configured" }, { status: 500 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: orgName,
        slug,
        subdomain: slug,
        brandName: orgName,
        status: "TRIAL",
        planType: "TRIAL",
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        trialStartedAt: now,
        trialEndsAt,
        users: {
          create: {
            firstName,
            lastName,
            email,
            passwordHash,
            role: "ORGANIZATION_ADMIN",
            isActive: true,
          },
        },
        subscription: {
          create: {
            planId: trialPlan.id,
            status: "TRIAL",
            startedAt: now,
            endsAt: trialEndsAt,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Trial organization created. Sign in to get started.",
        organization: { id: tenant.id, name: tenant.name, status: tenant.status, trialEndsAt },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Trial creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}