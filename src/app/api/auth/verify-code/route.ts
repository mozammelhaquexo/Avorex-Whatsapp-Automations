import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = supabaseAdmin();

    // Find the most recent unverified code for this email
    const { data: record, error: fetchErr } = await db
      .from("email_verifications")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("purpose", "signup")
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchErr || !record) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check max attempts
    if (record.attempts >= record.max_attempts) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Check code match
    if (record.code !== code.toString().trim()) {
      // Increment attempts
      await db
        .from("email_verifications")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);

      const remaining = record.max_attempts - record.attempts - 1;
      return NextResponse.json(
        {
          error: `Invalid code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
        },
        { status: 400 }
      );
    }

    // Mark as verified
    await db
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", record.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify code error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
