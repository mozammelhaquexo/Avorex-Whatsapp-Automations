import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendLogoutAlertEmail } from "@/lib/email";
import { logEmail } from "@/lib/email/log";

/**
 * POST /api/auth/logout-alert
 *
 * Called before/after logout to send a session-ended email.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ ok: true });

    const db = supabaseAdmin();
    const { data: profile } = await db
      .from("profiles")
      .select("full_name, account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown browser";
    const device = parseDevice(userAgent);

    try {
      const sent = await sendLogoutAlertEmail(user.email!, {
        userName: profile?.full_name || user.email?.split("@")[0] || "User",
        logoutTime: new Date().toISOString(),
        ip,
        device,
      });
      await logEmail({
        accountId: profile?.account_id || undefined,
        userId: user.id,
        recipient: user.email!,
        subject: "Session Ended",
        emailType: "logout_alert",
        status: sent ? "sent" : "failed",
        metadata: { ip, device },
      });
    } catch (emailErr) {
      console.error("[logout-alert] Email send failed:", emailErr);
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
