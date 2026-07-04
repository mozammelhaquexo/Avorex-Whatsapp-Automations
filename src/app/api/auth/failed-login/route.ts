import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendFailedLoginEmail } from "@/lib/email";
import { logEmail } from "@/lib/email/log";

/**
 * POST /api/auth/failed-login
 *
 * Called when a login attempt fails (wrong password, etc).
 * Checks if the email exists and sends a security alert.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ ok: true });

    const normalizedEmail = email.toLowerCase().trim();
    const db = supabaseAdmin();

    // Find the user by email
    const { data: authUsers } = await db.auth.admin.listUsers();
    const targetUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!targetUser) return NextResponse.json({ ok: true });

    // Get profile
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, account_id")
      .eq("user_id", targetUser.id)
      .maybeSingle();

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown browser";
    const device = parseDevice(userAgent);

    try {
      const sent = await sendFailedLoginEmail(normalizedEmail, {
        userName: profile?.full_name || normalizedEmail.split("@")[0],
        attemptTime: new Date().toISOString(),
        ip,
        device,
        reason: "Invalid password",
      });
      await logEmail({
        accountId: profile?.account_id || undefined,
        userId: targetUser.id,
        recipient: normalizedEmail,
        subject: "Failed Login Attempt",
        emailType: "failed_login",
        status: sent ? "sent" : "failed",
        metadata: { ip, device, reason: "invalid_password" },
      });
    } catch (emailErr) {
      console.error("[failed-login] Email send failed:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

function parseDevice(ua: string): string {
  if (!ua) return "Unknown device";
  if (/mobile|android|iphone/i.test(ua)) {
    if (/iphone/i.test(ua)) return "iPhone";
    if (/android/i.test(ua)) return "Android device";
    return "Mobile device";
  }
  if (/windows/i.test(ua)) return "Windows PC";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/linux/i.test(ua)) return "Linux PC";
  return "Desktop";
}
