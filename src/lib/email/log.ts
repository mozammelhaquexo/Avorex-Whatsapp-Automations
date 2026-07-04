import { supabaseAdmin } from "@/lib/ai/admin-client";

/**
 * Log an email send to the email_logs table.
 * Call this after every email send (success or failure).
 */
export async function logEmail(params: {
  accountId?: string;
  userId?: string;
  recipient: string;
  subject: string;
  emailType: string;
  status: "sent" | "failed" | "bounced";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = supabaseAdmin();
    await db.from("email_logs").insert({
      account_id: params.accountId || null,
      user_id: params.userId || null,
      recipient: params.recipient,
      subject: params.subject,
      email_type: params.emailType,
      status: params.status,
      metadata: params.metadata || {},
    });
  } catch (err) {
    // Log failures silently — email_logs is for audit, not critical path
    console.error("[emailLog] Failed to log email:", err);
  }
}

/**
 * Check if an email of the given type was already sent to this user recently.
 * Useful for dedup (e.g., don't send license expiry warning twice in one day).
 */
export async function wasEmailRecentlySent(
  userId: string,
  emailType: string,
  withinHours: number = 24
): Promise<boolean> {
  try {
    const db = supabaseAdmin();
    const cutoff = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("email_type", emailType)
      .eq("status", "sent")
      .gte("created_at", cutoff);
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
