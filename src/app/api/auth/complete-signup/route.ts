import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";

export async function POST(request: Request) {
  try {
    const { email, code, password, fullName } = await request.json();

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: "Email, code, and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const db = supabaseAdmin();

    // Find the most recent unverified code
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

    // Code verified — mark it
    await db
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", record.id);

    // Create Supabase user via admin client (auto-confirms email)
    const { data: userData, error: createErr } =
      await db.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || "",
        },
      });

    if (createErr) {
      console.error("Failed to create user:", createErr);
      return NextResponse.json(
        { error: createErr.message || "Failed to create account" },
        { status: 500 }
      );
    }

    // Ensure profile + account exist (trigger may have failed)
    const userId = userData.user?.id;
    if (userId) {
      const { data: existingProfile } = await db
        .from("profiles")
        .select("account_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingProfile || !existingProfile.account_id) {
        // Create account
        const { data: newAccount } = await db
          .from("accounts")
          .insert({ name: fullName || normalizedEmail, owner_user_id: userId })
          .select("id")
          .maybeSingle();

        // Create profile linked to account
        await db
          .from("profiles")
          .upsert({
            user_id: userId,
            full_name: fullName || "",
            email: normalizedEmail,
            account_id: newAccount?.id || null,
            account_role: "owner",
          }, { onConflict: "user_id" });
      }
    }

    // Send welcome email (non-blocking)
    try {
      const { sendWelcomeEmail } = await import("@/lib/email");
      const { logEmail } = await import("@/lib/email/log");
      const sent = await sendWelcomeEmail(normalizedEmail, {
        userName: fullName || normalizedEmail.split("@")[0],
      });
      await logEmail({
        recipient: normalizedEmail,
        subject: "Welcome to Avorex",
        emailType: "welcome",
        status: sent ? "sent" : "failed",
        userId: userData.user?.id,
      });
    } catch {
      // ignore — not critical
    }

    return NextResponse.json({
      success: true,
      userId: userData.user?.id,
    });
  } catch (err) {
    console.error("Complete signup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
