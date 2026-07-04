import { getCurrentAccount } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/ai/admin-client";

/**
 * Check if the current user's package allows access to the given menu key.
 *
 * Returns `{ allowed: true, accountId }` on success.
 * Returns `{ allowed: false, error }` with the appropriate NextResponse
 * when the user is denied.
 *
 * Usage in API routes:
 *
 *   const gate = await requireMenuAccess("agents");
 *   if (!gate.allowed) return gate.error;
 *   // gate.accountId is the workspace id
 */
export async function requireMenuAccess(
  menuKey: string
): Promise<
  | { allowed: true; accountId: string }
  | { allowed: false; error: Response }
> {
  try {
    const ctx = await getCurrentAccount();

    // Platform super admin always passes
    if (ctx.supabase) {
      // We don't have the email here directly, but admin@avorex.com is
      // handled at the UI level. For API routes, we check allowed_menus.
    }

    const db = supabaseAdmin();
    const { data: account } = await db
      .from("accounts")
      .select("allowed_menus, plan")
      .eq("id", ctx.accountId)
      .maybeSingle();

    if (!account) {
      return {
        allowed: false,
        error: Response.json(
          { error: "Account not found" },
          { status: 403 }
        ),
      };
    }

    const allowed = account.allowed_menus;
    if (!allowed || allowed.length === 0) {
      // No restrictions configured — allow
      return { allowed: true, accountId: ctx.accountId };
    }

    if (allowed.includes(menuKey)) {
      return { allowed: true, accountId: ctx.accountId };
    }

    return {
      allowed: false,
      error: Response.json(
        {
          error: "This feature is not included in your current plan",
          requiredMenu: menuKey,
          plan: account.plan,
        },
        { status: 403 }
      ),
    };
  } catch (err: any) {
    // Auth errors (401/403) pass through
    if (err?.status === 401 || err?.status === 403) {
      return {
        allowed: false,
        error: Response.json(
          { error: err.message || "Unauthorized" },
          { status: err.status }
        ),
      };
    }
    return {
      allowed: false,
      error: Response.json(
        { error: "Internal server error" },
        { status: 500 }
      ),
    };
  }
}
