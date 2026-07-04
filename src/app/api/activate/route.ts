import { NextResponse } from "next/server";
import {
  getCurrentAccount,
  toErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/ai/admin-client";

/**
 * POST /api/activate
 * Strict license key verification + binding to the current account.
 *
 * SECURITY:
 * - Never return full license key to the browser.
 * - Enforce suspended/revoked/disabled blocks.
 * - Enforce ownership + plan/package match.
 * - Enforce device fingerprint binding when available.
 */
export async function POST(request: Request) {
  try {
    const { key } = await request.json();
    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "লাইসেন্স কী সঠিক নয়। অনুগ্রহ করে সঠিক লাইসেন্স কী দিন।" }, { status: 400 });
    }

    const trimmedKey = key.trim();

    const ctx = await getCurrentAccount();
    const workspaceId = ctx.accountId;
    const userId = ctx.userId;

    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found for user" }, { status: 404 });
    }

    const db = supabaseAdmin();

    // Load account info (best-effort, may fail if columns are missing)
    let accountPlan: string | null = null;
    let accountDevice: string | null = null;
    try {
      const { data: account } = await db
        .from("accounts")
        .select("plan, device_fingerprint")
        .eq("id", workspaceId)
        .maybeSingle();
      accountPlan = account?.plan ?? null;
      accountDevice = account?.device_fingerprint ?? null;
    } catch {
      // columns may not exist yet
    }

    // Look up the license key row
    const { data: licenseKey, error: keyErr } = await db
      .from("license_keys")
      .select(
        "id, key_code, plan, status, expiry_date, expires_at, activation_count, max_activations, device_fingerprint, user_id"
      )
      .eq("key_code", trimmedKey)
      .maybeSingle();

    if (keyErr) {
      console.error("[activate] license_keys query error:", keyErr);
      return NextResponse.json({ error: `License table error: ${keyErr.message}` }, { status: 500 });
    }

    if (!licenseKey) {
      return NextResponse.json({ error: "লাইসেন্স কী সঠিক নয়। অনুগ্রহ করে সঠিক লাইসেন্স কী দিন।" }, { status: 400 });
    }

    const status = String(licenseKey.status || "").toLowerCase();
    const isBlockedStatus = ["disabled", "suspended", "revoked"].includes(status);

    if (isBlockedStatus) {
      return NextResponse.json(
        { error: "আপনার লাইসেন্স বর্তমানে বন্ধ রয়েছে। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।" },
        { status: 400 },
      );
    }

    // Expiry checks (support both new and legacy column names)
    const expiryRaw = licenseKey.expiry_date ?? licenseKey.expires_at ?? null;
    if (expiryRaw) {
      const expiryDate = new Date(expiryRaw);
      if (expiryDate < new Date()) {
        return NextResponse.json({ error: "Your License Has Expired" }, { status: 400 });
      }
    }

    // Ownership check: if license is bound to a user, it must match the currently logged-in user.
    if (licenseKey.user_id && licenseKey.user_id !== userId) {
      return NextResponse.json(
        { error: "এই লাইসেন্স কী আপনার অ্যাকাউন্টের সাথে যুক্ত নয়।" },
        { status: 400 },
      );
    }

    // Plan/package mismatch check:
    // If account already has a plan assigned, the entered key must match it.
    if (accountPlan && licenseKey.plan !== accountPlan) {
      return NextResponse.json(
        { error: "এই লাইসেন্স কী আপনার বর্তমান প্যাকেজের সাথে মিলছে না।" },
        { status: 400 },
      );
    }

    // Device fingerprint authorization:
    const licenseDevice = licenseKey.device_fingerprint ? String(licenseKey.device_fingerprint) : null;

    if (licenseDevice && accountDevice && licenseDevice !== accountDevice) {
      return NextResponse.json(
        { error: "আপনার লাইসেন্স ডিভাইসের সাথে মেলে না। বিস্তারিত জানতে অ্যাডমিনের সাথে যোগাযোগ করুন।" },
        { status: 400 },
      );
    }

    // Activation limit
    if (
      typeof licenseKey.max_activations === "number" &&
      typeof licenseKey.activation_count === "number" &&
      licenseKey.activation_count >= licenseKey.max_activations
    ) {
      return NextResponse.json(
        { error: "This license activation limit has been reached" },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();

    // Determine allowed menus for this plan
    let allowedMenus: string[] | null = null;
    try {
      const { getAllowedMenus } = await import("@/lib/license");
      allowedMenus = getAllowedMenus(licenseKey.plan);
    } catch {
      allowedMenus = null;
    }

    // Determine package_id by plan code/name best-effort.
    let packageId: string | null = null;
    try {
      const { data: pkg } = await db
        .from("packages")
        .select("id")
        .eq("code", licenseKey.plan)
        .maybeSingle();

      packageId = pkg?.id ?? null;
    } catch {
      packageId = null;
    }

    // Bind/update the license key row.
    // Note: Some legacy columns may not exist; we update only what exists in current migrations.
    const keyUpdateData: Record<string, any> = {
      status: "used",
      activation_count: (licenseKey.activation_count ?? 0) + 1,
      device_fingerprint: accountDevice || licenseDevice || null,
      user_id: licenseKey.user_id ?? userId,
      expiry_date: licenseKey.expiry_date ?? licenseKey.expires_at ?? null,
      last_validated_at: nowIso,
    };

    const { error: keyUpdateErr } = await db
      .from("license_keys")
      .update(keyUpdateData)
      .eq("id", licenseKey.id);

    if (keyUpdateErr) {
      console.error("[activate] license_keys update error:", keyUpdateErr);
      return NextResponse.json({ error: `License update failed: ${keyUpdateErr.message}` }, { status: 500 });
    }

    // Update the account/workspace with the license + plan and device binding.
    const accountUpdateData: Record<string, any> = {
      license_key: licenseKey.key_code,
      plan: licenseKey.plan,
      license_activated_at: nowIso,
      license_expires_at: licenseKey.expiry_date ?? licenseKey.expires_at ?? null,
      allowed_menus: allowedMenus ?? [],
      package_id: packageId,
      device_fingerprint: accountDevice || licenseDevice || null,
    };

    const { error: accountUpdateErr } = await db
      .from("accounts")
      .update(accountUpdateData)
      .eq("id", workspaceId);

    if (accountUpdateErr) {
      console.error("[activate] accounts update error:", accountUpdateErr);
      // Rollback best-effort
      try {
        await db.from("license_keys").update({ status: "active" }).eq("id", licenseKey.id);
      } catch {
        // ignore
      }
      return NextResponse.json({ error: `Account update failed: ${accountUpdateErr.message}` }, { status: 500 });
    }

    // Activation logs best-effort (tables may not exist yet)
    try {
      await db.from("license_activation_logs").insert({
        license_key_id: licenseKey.id,
        user_id: userId,
        account_id: workspaceId,
        device_fingerprint: accountDevice || null,
        action: "activate",
        success: true,
        ip_address: request.headers.get("x-forwarded-for") || null,
      });
    } catch {
      // ignore
    }

    // Audit logs best-effort
    try {
      await db.from("audit_logs").insert({
        account_id: workspaceId,
        user_id: userId,
        action: "license_activated",
        details: { plan: licenseKey.plan },
        ip_address: request.headers.get("x-forwarded-for") || null,
        user_agent: request.headers.get("user-agent") || null,
      });
    } catch {
      // ignore
    }

    // Send license activated email (non-blocking)
    try {
      const { sendLicenseActivatedEmail } = await import("@/lib/email");
      const { logEmail } = await import("@/lib/email/log");
      const { data: userEmail } = await db.auth.admin.getUserById(userId);
      if (userEmail?.user?.email) {
        const sent = await sendLicenseActivatedEmail(userEmail.user.email, {
          userName: userEmail.user.user_metadata?.full_name || "User",
          plan: licenseKey.plan,
          licenseKey: licenseKey.key_code,
          expiresAt: licenseKey.expiry_date ?? licenseKey.expires_at ?? null,
          activatedAt: nowIso,
        });
        await logEmail({
          accountId: workspaceId,
          userId,
          recipient: userEmail.user.email,
          subject: "License Activated",
          emailType: "license_activated",
          status: sent ? "sent" : "failed",
          metadata: { plan: licenseKey.plan },
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, plan: licenseKey.plan });
  } catch (err) {
    // Avoid leaking internal wiring issues like "Could not load account ...".
    if (err instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: "আপনার সেশন এক্সপায়ার হয়েছে। অনুগ্রহ করে আবার লগইন করুন।" },
        { status: 401 }
      );
    }

    if (err instanceof ForbiddenError) {
      // Profile/account not linked or RLS blocked.
      return NextResponse.json(
        { error: "আপনার অ্যাকাউন্টের সাথে লাইসেন্স অ্যাক্টিভ করার তথ্য পাওয়া যাচ্ছে না। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।" },
        { status: 403 }
      );
    }

    return toErrorResponse(err);
  }
}
