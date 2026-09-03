import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/commercial/request-demo — REQUEST DEMO / CONTACT SALES.
 *
 * Lightweight conversion path. No user/tenant is created here; this endpoint
 * simply acknowledges a sales-contact request (a real CRM/email hook is a
 * documented non-blocking P2). It never sends emails and never touches the DB.
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(`request-demo:${clientIp(request)}`, 5, 600);
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

  const { orgName, contactName, contactEmail, message } = body;
  if (!orgName || !contactName || !contactEmail) {
    return NextResponse.json({ error: "orgName, contactName and contactEmail are required" }, { status: 400 });
  }

  return NextResponse.json({
    message: "Demo request received. Our team will reach out at the provided contact.",
    // Truncate to avoid reflecting unbounded user input.
    received: {
      orgName: String(orgName).slice(0, 120),
      contactName: String(contactName).slice(0, 120),
      contactEmail: String(contactEmail).slice(0, 254),
    },
  });
}