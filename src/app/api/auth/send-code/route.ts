import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendVerificationCode, generateCode } from "@/lib/email";

const CODE_EXPIRY_MINUTES = 10;
const MAX_CODES_PER_HOUR = 5;

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = supabaseAdmin();

    // Rate limit: max 5 codes per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("email_verifications")
      .select("id", { count: "exact", head: true })
      .eq("email", normalizedEmail)
      .eq("purpose", "signup")
      .gte("created_at", oneHourAgo);

    if (count && count >= MAX_CODES_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Invalidate any previous unverified codes for this email
    await db
      .from("email_verifications")
      .update({ verified: true })
      .eq("email", normalizedEmail)
      .eq("purpose", "signup")
      .eq("verified", false);

    // Generate and store new code
    const code = generateCode();
    const expiresAt = new Date(
      Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const { error: insertErr } = await db.from("email_verifications").insert({
      email: normalizedEmail,
      code,
      purpose: "signup",
      expires_at: expiresAt,
    });

    if (insertErr) {
      console.error("Failed to store verification code:", insertErr);
      return NextResponse.json(
        { error: "Failed to create verification code" },
        { status: 500 }
      );
    }

    // Send email
    const result = await sendVerificationCode(normalizedEmail, code);

    // Log the email send
    try {
      const { logEmail } = await import("@/lib/email/log");
      await logEmail({
        recipient: normalizedEmail,
        subject: "Verify Your Email",
        emailType: "verification",
        status: result.success ? "sent" : "failed",
      });
    } catch {
      // ignore — logging is non-critical
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Send code error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
