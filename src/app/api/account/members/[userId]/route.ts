// ============================================================
// /api/account/members/[userId]
//
//   PATCH  — change a member's role.   Admin+.
//   DELETE — remove a member.          Admin+.
//
// Both delegate to SECURITY DEFINER RPCs from migration 018:
//   - set_member_role(p_user_id, p_new_role)
//   - remove_account_member(p_user_id)
//
// The RPCs do the *real* authorisation work — caller must be
// admin+, target must be in caller's account, target can't be the
// owner, can't be self. The TS layer here only forwards the call
// and maps Postgres SQLSTATEs back to HTTP statuses.
// ============================================================

import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { requireRole, toErrorResponse } from "@/lib/auth/account";
import { isAccountRole } from "@/lib/auth/roles";
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";

// Map known SQLSTATEs from the RPCs (see migration 018) onto HTTP
// statuses. The `error.code` field is the SQLSTATE; the `message`
// is the human-readable RAISE message we put in the migration.
function rpcErrorToResponse(err: PostgrestError): NextResponse {
  if (err.code === "42501") {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err.code === "22023") {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  console.error("[members route] unexpected RPC error:", err);
  return NextResponse.json(
    { error: "Failed to update member" },
    { status: 500 },
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRole:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const body = (await request.json().catch(() => null)) as
      | { role?: unknown }
      | null;
    const role = body?.role;

    if (!isAccountRole(role)) {
      return NextResponse.json(
        { error: "'role' must be one of owner, admin, agent, viewer" },
        { status: 400 },
      );
    }

    // The RPC blocks promotion to / demotion from owner, but
    // surface the friendlier 400 before crossing the wire too.
    if (role === "owner") {
      return NextResponse.json(
        {
          error:
            "Use POST /api/account/transfer-ownership to promote a member to owner",
        },
        { status: 400 },
      );
    }

    // Capture old role before RPC changes it
    const { supabaseAdmin: dbAdmin } = await import("@/lib/ai/admin-client");
    const dbInstance = dbAdmin();
    const { data: targetProfileBefore } = await dbInstance
      .from("profiles")
      .select("account_role")
      .eq("user_id", userId)
      .maybeSingle();
    const oldRole = targetProfileBefore?.account_role || "member";

    const { error } = await ctx.supabase.rpc("set_member_role", {
      p_user_id: userId,
      p_new_role: role,
    });

    if (error) return rpcErrorToResponse(error);

    // Send role changed email
    try {
      const { sendRoleChangedEmail } = await import("@/lib/email");
      const { logEmail } = await import("@/lib/email/log");

      const { data: targetProfile } = await dbInstance
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (targetProfile?.email) {
        const sent = await sendRoleChangedEmail(targetProfile.email, {
          userName: targetProfile.full_name || "User",
          oldRole,
          newRole: role,
          changedBy: ctx.account.name || "Admin",
        });
        await logEmail({
          accountId: ctx.accountId,
          userId,
          recipient: targetProfile.email,
          subject: "Your Role Has Been Updated",
          emailType: "role_changed",
          status: sent ? "sent" : "failed",
          metadata: { new_role: role },
        });
      }
    } catch (emailErr) {
      console.error("[members PATCH] Email send failed:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const ctx = await requireRole("admin");

    const limit = checkRateLimit(
      `admin:memberRemove:${ctx.userId}`,
      RATE_LIMITS.adminAction,
    );
    if (!limit.success) return rateLimitResponse(limit);

    const { userId } = await params;

    const { data, error } = await ctx.supabase.rpc("remove_account_member", {
      p_user_id: userId,
    });

    if (error) return rpcErrorToResponse(error);

    // Send member removed email
    try {
      const { sendMemberRemovedEmail } = await import("@/lib/email");
      const { logEmail } = await import("@/lib/email/log");
      const { supabaseAdmin } = await import("@/lib/ai/admin-client");
      const db = supabaseAdmin();

      const { data: targetProfile } = await db
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", userId)
        .maybeSingle();

      if (targetProfile?.email) {
        const sent = await sendMemberRemovedEmail(targetProfile.email, {
          userName: targetProfile.full_name || "User",
          removedBy: ctx.account.name || "Admin",
          teamName: ctx.account.name || "Team",
        });
        await logEmail({
          accountId: ctx.accountId,
          userId,
          recipient: targetProfile.email,
          subject: "Removed from Team",
          emailType: "member_removed",
          status: sent ? "sent" : "failed",
        });
      }
    } catch (emailErr) {
      console.error("[members DELETE] Email send failed:", emailErr);
    }

    return NextResponse.json({ ok: true, newPersonalAccountId: data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
