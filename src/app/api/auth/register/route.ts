import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(`register:${clientIp(request)}`, 10, 600);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { firstName, lastName, email, password, dateOfBirth, mobile, gender, gradeLevel, studyLevel, exams } = body;

    if (body._hp) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!firstName || !lastName || !email || !password || !mobile || !gender || !gradeLevel) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Generic message so unauthenticated callers cannot enumerate accounts.
      return NextResponse.json(
        { error: "Unable to create account with these details" },
        { status: 409 }
      );
    }

    const host = request.headers.get("host") || "";
    const tenantSub = extractSubdomain(host);
    const tenantId = tenantSub === "default" ? "default" : tenantSub;

    let tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantId },
    });

    // On local developer machines (localhost / raw IPs) there is no real
    // subdomain, so fall back to the platform's first tenant to keep local
    // demo/test signups working. On any deployed host an unmatched subdomain
    // is rejected rather than silently enrolling the student into an arbitrary
    // organization.
    if (!tenant && isLocalDevHost(host)) {
      tenant = await prisma.tenant.findFirst();
    }
    if (!tenant) {
      return NextResponse.json(
        { error: "Organization not found for this address" },
        { status: 400 }
      );
    }

    // Suspended organizations cannot create new usage (Phase 19 §17-F). A
    // suspended org admin can still log in to reach support/upgrade routes,
    // but new public signups for that tenant are rejected at the entry point.
    if (tenant.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This organization is currently suspended. Contact support." },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: "STUDENT",
        tenantId: tenant.id,
        studentProfile: {
          create: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            mobile: mobile || null,
            gender: gender || null,
            gradeLevel: gradeLevel || null,
            studyLevel: studyLevel || null,
            exams: exams || [],
            featureAccess: { create: {} },
          },
        },
      },
      include: { studentProfile: true },
    });

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function extractSubdomain(hostname: string): string {
  const host = hostname.replace(/:\d+$/, "");
  const parts = host.split(".");
  if (
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    parts.length < 3
  ) {
    return "default";
  }
  return parts[0];
}

function isLocalDevHost(hostname: string): boolean {
  const host = hostname.replace(/:\d+$/, "").toLowerCase();
  if (host.includes("localhost") || host.includes("127.0.0.1")) return true;
  const parts = host.split(".");
  return parts.length > 0 && parts.every((p) => /^\d+$/.test(p));
}
