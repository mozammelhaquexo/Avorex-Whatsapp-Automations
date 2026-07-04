import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendLicenseExpiryEmail, sendLicenseExpiredEmail } from "@/lib/email";
import { logEmail } from "@/lib/email/log";

/**
 * GET /api/cron/license-expiry
 *
 * Cron job — checks for licenses expiring soon and sends warnings.
 * Call this daily via external cron (Vercel Cron, cron-job.org, etc.)
 *
 * Protected: only accepts requests with CRON_SECRET header.
 */
export async function GET(request: Request) {
  // Protect with cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const results = { expired: 0, warnings: 0, errors: 0 };

  try {
    // 1. Find licenses expiring in 7, 3, or 1 day(s)
    const warningDays = [7, 3, 1];
    for (const days of warningDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      // Check a window around the target date (same day)
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: accounts } = await db
        .from("accounts")
        .select("id, plan, license_expires_at, owner_user_id")
        .not("license_expires_at", "is", null)
        .gte("license_expires_at", dayStart.toISOString())
        .lte("license_expires_at", dayEnd.toISOString());

      if (!accounts || accounts.length === 0) continue;

      for (const acct of accounts) {
        try {
          // Get user email
          const { data: profile } = await db
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", acct.owner_user_id)
            .maybeSingle();

          if (!profile?.email) continue;

          // Dedup: don't send if already sent in last 20 hours
          const { count } = await db
            .from("email_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", acct.owner_user_id)
            .eq("email_type", "license_expiry")
            .eq("status", "sent")
            .gte("created_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString());

          if ((count ?? 0) > 0) continue;

          const sent = await sendLicenseExpiryEmail(profile.email, {
            userName: profile.full_name || "User",
            plan: acct.plan || "Unknown",
            expiresAt: acct.license_expires_at,
            daysLeft: days,
          });

          await logEmail({
            accountId: acct.id,
            userId: acct.owner_user_id,
            recipient: profile.email,
            subject: `License Expiring in ${days} Day${days > 1 ? "s" : ""}`,
            emailType: "license_expiry",
            status: sent ? "sent" : "failed",
            metadata: { days_left: days, plan: acct.plan },
          });

          if (sent) results.warnings++;
        } catch {
          results.errors++;
        }
      }
    }

    // 2. Find already-expired licenses (expired in the last 24 hours)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: expiredAccounts } = await db
      .from("accounts")
      .select("id, plan, license_expires_at, owner_user_id")
      .not("license_expires_at", "is", null)
      .lt("license_expires_at", now.toISOString())
      .gte("license_expires_at", yesterday.toISOString());

    if (expiredAccounts) {
      for (const acct of expiredAccounts) {
        try {
          const { data: profile } = await db
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", acct.owner_user_id)
            .maybeSingle();

          if (!profile?.email) continue;

          // Dedup
          const { count } = await db
            .from("email_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", acct.owner_user_id)
            .eq("email_type", "license_expired")
            .eq("status", "sent")
            .gte("created_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString());

          if ((count ?? 0) > 0) continue;

          const sent = await sendLicenseExpiredEmail(profile.email, {
            userName: profile.full_name || "User",
            plan: acct.plan || "Unknown",
            expiredAt: acct.license_expires_at,
          });

          await logEmail({
            accountId: acct.id,
            userId: acct.owner_user_id,
            recipient: profile.email,
            subject: "License Expired",
            emailType: "license_expired",
            status: sent ? "sent" : "failed",
            metadata: { plan: acct.plan },
          });

          if (sent) results.expired++;
        } catch {
          results.errors++;
        }
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[cron/license-expiry] Fatal error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
