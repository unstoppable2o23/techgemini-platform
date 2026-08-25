import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const appointmentId = formData.get("appointmentId") as string;
    const file = formData.get("file") as File;

    if (!appointmentId || !file) {
      return NextResponse.json({ error: "appointmentId and file are required" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);
    if (!detected.ok) {
      return NextResponse.json({ error: "Unsupported or invalid file type. Only JPG, PNG, WebP, and PDF are allowed." }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { paymentProof: true },
    });

    if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    if (appointment.userId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    if (appointment.paymentProof) return NextResponse.json({ error: "Payment proof already uploaded" }, { status: 409 });

    // Lazy cleanup: purge proofs that have outlived their 30-day TTL whenever
    // anyone uploads a new proof.
    await prisma.paymentProof.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    const counselorProfile = await prisma.counselorProfile.findUnique({
      where: { userId: appointment.counselorId },
    });
    if (!counselorProfile) return NextResponse.json({ error: "Counselor profile not found" }, { status: 404 });

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${detected.mime};base64,${base64}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const proof = await prisma.paymentProof.create({
      data: {
        appointmentId,
        fileUrl: dataUrl,
        fileName: `payment-proof-${Date.now()}.${detected.ext}`,
        counselorId: counselorProfile.id,
        expiresAt,
      },
    });

    return NextResponse.json({ proof }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload payment proof:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Sniffs magic bytes to reject files that are not actually images or PDFs.
 * The MIME type from the client is never trusted.
 */
function detectImageType(buf: Buffer): { ok: false } | { ok: true; mime: string; ext: string } {
  if (buf.length < 12) return { ok: false };

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ok: true, mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e &&
    buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a &&
    buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return { ok: true, mime: "image/png", ext: "png" };
  }

  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 &&
    buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 &&
    buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return { ok: true, mime: "image/webp", ext: "webp" };
  }

  // PDF: %PDF
  if (
    buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 &&
    buf[3] === 0x46
  ) {
    return { ok: true, mime: "application/pdf", ext: "pdf" };
  }

  return { ok: false };
}
