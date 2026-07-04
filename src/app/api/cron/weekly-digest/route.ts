import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { sendWeeklyDigestEmail } from "@/lib/email";
import { logEmail } from "@/lib/email/log";

/**
 * GET /api/cron/weekly-digest
 *
 * Cron job — sends weekly digest emails to all active users.
 * Call this once a week (e.g., every Monday at 9 AM).
 *
 * Protected: only accepts requests with CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();
  const weekEnd = new Date(now);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const results = { sent: 0, errors: 0 };

  try {
    // Get all accounts with active plans
    const { data: accounts } = await db
      .from("accounts")
      .select("id, plan, license_expires_at, owner_user_id")
      .not("plan", "is", null);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ ok: true, results, message: "No active accounts" });
    }

    for (const acct of accounts) {
      try {
        // Get user info
        const { data: profile } = await db
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", acct.owner_user_id)
          .maybeSingle();

        if (!profile?.email) continue;

        // Dedup: don't send if already sent in last 5 days
        const { count } = await db
          .from("email_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", acct.owner_user_id)
          .eq("email_type", "weekly_digest")
          .eq("status", "sent")
          .gte("created_at", new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString());

        if ((count ?? 0) > 0) continue;

        // Gather stats for this account in the past week
        const stats = await gatherWeeklyStats(db, acct.id, weekStart, weekEnd);

        // License days remaining
        let licenseDaysLeft: number | null = null;
        if (acct.license_expires_at) {
          const exp = new Date(acct.license_expires_at);
          licenseDaysLeft = Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        const sent = await sendWeeklyDigestEmail(profile.email, {
          userName: profile.full_name || "User",
          weekStart: weekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          stats,
          licenseExpiresIn: licenseDaysLeft,
        });

        await logEmail({
          accountId: acct.id,
          userId: acct.owner_user_id,
          recipient: profile.email,
          subject: "Your Weekly Avorex Digest",
          emailType: "weekly_digest",
          status: sent ? "sent" : "failed",
          metadata: { stats, license_days_left: licenseDaysLeft },
        });

        if (sent) results.sent++;
      } catch {
        results.errors++;
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[cron/weekly-digest] Fatal error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function gatherWeeklyStats(
  db: ReturnType<typeof supabaseAdmin>,
  accountId: string,
  weekStart: Date,
  weekEnd: Date
) {
  const stats = {
    messagesHandled: 0,
    contactsAdded: 0,
    broadcastsSent: 0,
    automationsRan: 0,
  };

  try {
    // Messages handled (conversations with messages in the week)
    const { count: msgs } = await db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());
    stats.messagesHandled = msgs ?? 0;
  } catch { /* table may not exist */ }

  try {
    const { count: contacts } = await db
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());
    stats.contactsAdded = contacts ?? 0;
  } catch { /* table may not exist */ }

  try {
    const { count: broadcasts } = await db
      .from("broadcasts")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());
    stats.broadcastsSent = broadcasts ?? 0;
  } catch { /* table may not exist */ }

  try {
    const { count: automations } = await db
      .from("automation_runs")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());
    stats.automationsRan = automations ?? 0;
  } catch { /* table may not exist */ }

  return stats;
}
