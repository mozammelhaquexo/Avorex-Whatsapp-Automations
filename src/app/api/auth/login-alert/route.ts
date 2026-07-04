import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendLoginAlertEmail } from "@/lib/email";
import { logEmail } from "@/lib/email/log";

/**
 * POST /api/auth/login-alert
 *
 * Called after a successful login to send a security alert email.
 * Uses the authenticated session to identify the user.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: true }); // silent fail — not critical
    }

    // Get user profile
    const db = supabaseAdmin();
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get login metadata from request headers
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown browser";

    // Parse device info from user agent
    const device = parseDevice(userAgent);

    // Send login alert email (non-blocking, don't fail the login)
    try {
      const sent = await sendLoginAlertEmail(user.email!, {
        userName: profile?.full_name || user.email?.split("@")[0] || "User",
        loginTime: new Date().toISOString(),
        ip,
        device,
      });

      await logEmail({
        accountId: profile?.account_id || undefined,
        userId: user.id,
        recipient: user.email!,
        subject: "New Login Detected",
        emailType: "login_alert",
        status: sent ? "sent" : "failed",
        metadata: { ip, device, user_agent: userAgent },
      });
    } catch (emailErr) {
      console.error("[login-alert] Email send failed:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // never block login
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
