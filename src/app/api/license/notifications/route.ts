import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { getRemainingDays } from "@/lib/license";

/**
 * POST /api/license/notifications
 * Sends renewal reminder notifications for licenses expiring in 7, 3, or 1 days.
 * Intended to be called by a cron job (e.g., daily at midnight).
 */
export async function POST(request: Request) {
  try {
    // Verify the request is from a cron job or has a valid secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = supabaseAdmin();
    const notificationsSent: string[] = [];

    // Find all accounts with active licenses that have expiry dates
    const { data: accounts, error: accErr } = await db
      .from("accounts")
      .select("id, name, license_key, license_expires_at, owner_user_id")
      .not("license_expires_at", "is", null)
      .not("license_key", "is", null);

    if (accErr) throw accErr;

    for (const account of accounts || []) {
      if (!account.license_expires_at || !account.owner_user_id) continue;

      const remainingDays = getRemainingDays(account.license_expires_at);
      if (remainingDays === null) continue;

      // Send notifications at 7, 3, and 1 day(s) before expiry
      const reminderDays = [7, 3, 1];
      if (!reminderDays.includes(remainingDays)) continue;

      // Check if we already sent a notification for this reminder period
      const { data: existingNotification } = await db
        .from("notifications")
        .select("id")
        .eq("account_id", account.id)
        .eq("user_id", account.owner_user_id)
        .eq("type", "license_expiry_reminder")
        .contains("details", { remaining_days: remainingDays })
        .maybeSingle();

      if (existingNotification) continue;

      // Create the notification
      const { error: notifErr } = await db.from("notifications").insert({
        account_id: account.id,
        user_id: account.owner_user_id,
        type: "license_expiry_reminder",
        title: `License expiring in ${remainingDays} day${remainingDays === 1 ? "" : "s"}`,
        body: `Your license for ${account.name || "your workspace"} will expire in ${remainingDays} day${remainingDays === 1 ? "" : "s"}. Please renew your license to avoid service interruption.`,
        details: {
          remaining_days: remainingDays,
          expires_at: account.license_expires_at,
        },
      });

      if (!notifErr) {
        notificationsSent.push(
          `${account.id}: ${remainingDays} day(s) reminder`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      accountsChecked: (accounts || []).length,
      notificationsSent: notificationsSent.length,
      details: notificationsSent,
    });
  } catch (err) {
    console.error("[License Notifications] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
