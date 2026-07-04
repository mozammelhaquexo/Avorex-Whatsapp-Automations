import { NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/ai/admin-client";

/**
 * GET /api/license/validate - Strict server-side license decision helper
 *
 * IMPORTANT SECURITY:
 * - NEVER return full stored license key to the browser.
 * - Return a backend-driven "decisionTree" so the frontend only renders
 *   based on server truth.
 */
export async function GET() {
  let ctx;
  try {
    ctx = await getCurrentAccount();
  } catch {
    // Profile/account not set up yet — treat as new user with no plan
    return NextResponse.json(
      { decisionTree: "NO_PLAN", hasPlan: false, plan: null, package: null },
      { status: 200 }
    );
  }

  try {
    const workspaceId = ctx.accountId;

    if (!workspaceId) {
      return NextResponse.json(
        { decisionTree: "NO_PLAN", hasPlan: false },
        { status: 200 }
      );
    }

    const db = supabaseAdmin();

    // Load account (plan + assigned package + license timestamps / device).
    const { data: account, error: accountErr } = await db
      .from("accounts")
      .select("*")
      .eq("id", workspaceId)
      .maybeSingle();

    if (accountErr || !account) {
      return NextResponse.json(
        { decisionTree: "NO_PLAN", hasPlan: false },
        { status: 200 }
      );
    }

    const hasAssignedPlan = !!account.plan;
    const hasStoredLicenseKey = !!account.license_key;

    // Case A: No plan assigned at all => Activate Your License (show packages)
    if (!hasAssignedPlan) {
      return NextResponse.json(
        {
          decisionTree: "NO_PLAN",
          hasPlan: false,
          plan: null,
          package: null,
        },
        { status: 200 }
      );
    }

    // Case B: Has plan but missing license_key => need to enter key
    if (!hasStoredLicenseKey) {
      return NextResponse.json(
        {
          decisionTree: "NO_LICENSE",
          hasPlan: true,
          plan: account.plan,
        },
        { status: 200 }
      );
    }

    const now = new Date();
    const expiresAt = account.license_expires_at ? new Date(account.license_expires_at) : null;

    const isExpired = expiresAt ? expiresAt < now : false;

    const isInGracePeriod =
      isExpired &&
      account.grace_period_ends_at &&
      new Date(account.grace_period_ends_at) > now;

    // If explicitly expired and grace not active => Expired page
    if (isExpired && !isInGracePeriod) {
      return NextResponse.json(
        {
          decisionTree: "EXPIRED",
          hasPlan: true,
          plan: account.plan,
          expiresAt: account.license_expires_at,
          gracePeriodEndsAt: account.grace_period_ends_at || null,
        },
        { status: 200 }
      );
    }

    // Load package details best-effort (for UI display/status)
    let packageData: any = null;
    try {
      const { data: pkg } = await db
        .from("packages")
        .select("id, name, code, features, price, allowed_menus, duration, is_active")
        .eq("code", account.plan)
        .maybeSingle();
      packageData = pkg;
    } catch {
      // ignore
    }

    // Load license_keys row by key_code stored on account.
    const storedKey = String(account.license_key);
    const { data: licenseRow, error: licErr } = await db
      .from("license_keys")
      .select("id, key_code, plan, status, expiry_date, activation_count, max_activations, device_fingerprint")
      .eq("key_code", storedKey)
      .maybeSingle();

    if (licErr || !licenseRow) {
      // Account has a plan, but the generated license record is missing.
      // Treat as "activate/enter license" flow, not as "normal no-plan".
      return NextResponse.json(
        {
          decisionTree: "NO_LICENSE",
          hasPlan: true,
          plan: account.plan,
        },
        { status: 200 }
      );
    }

    // License status gates (suspended/revoked/disabled)
    const status = String(licenseRow.status || "").toLowerCase();
    const isBlockedStatus = ["disabled", "suspended", "revoked"].includes(status);

    if (isBlockedStatus) {
      return NextResponse.json(
        {
          decisionTree: "SUSPENDED_OR_REVOKED",
          hasPlan: true,
          plan: account.plan,
          expiresAt: account.license_expires_at || null,
        },
        { status: 200 }
      );
    }

    // Active validation: expiry_date + activation limits
    const licenseExpiry = licenseRow.expiry_date ? new Date(licenseRow.expiry_date) : null;
    if (licenseExpiry && licenseExpiry < now) {
      return NextResponse.json(
        {
          decisionTree: "EXPIRED",
          hasPlan: true,
          plan: account.plan,
          expiresAt: account.license_expires_at || null,
          gracePeriodEndsAt: account.grace_period_ends_at || null,
        },
        { status: 200 }
      );
    }

    if (
      typeof licenseRow.max_activations === "number" &&
      typeof licenseRow.activation_count === "number" &&
      licenseRow.activation_count > licenseRow.max_activations
    ) {
      return NextResponse.json(
        {
          decisionTree: "EXPIRED",
          hasPlan: true,
          plan: account.plan,
          expiresAt: account.license_expires_at || null,
          gracePeriodEndsAt: account.grace_period_ends_at || null,
        },
        { status: 200 }
      );
    }

    // Ownership + package match: licenseRow.plan must match assigned plan.
    if (licenseRow.plan !== account.plan) {
      return NextResponse.json(
        {
          decisionTree: "PACKAGE_MISMATCH",
          hasPlan: true,
          plan: account.plan,
        },
        { status: 200 }
      );
    }

    // Device fingerprint check (strict when both sides have values)
    const accountDevice = account.device_fingerprint ? String(account.device_fingerprint) : null;
    const licenseDevice = licenseRow.device_fingerprint ? String(licenseRow.device_fingerprint) : null;

    if (licenseDevice && accountDevice && licenseDevice !== accountDevice) {
      return NextResponse.json(
        {
          decisionTree: "DEVICE_NOT_AUTHORIZED",
          hasPlan: true,
          plan: account.plan,
        },
        { status: 200 }
      );
    }

    // If everything is correct => Active plan verified
    return NextResponse.json(
      {
        decisionTree: "ACTIVE_PLAN_VERIFIED",
        hasPlan: true,
        plan: account.plan,
        status: isInGracePeriod ? "GRACE" : "ACTIVE",
        activatedAt: account.license_activated_at || null,
        expiresAt: account.license_expires_at || null,
        remainingDays: account.license_expires_at
          ? Math.max(
            0,
            Math.ceil(
              (new Date(account.license_expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          )
          : null,
        gracePeriodEndsAt: account.grace_period_ends_at || null,
        allowedMenus: account.allowed_menus || packageData?.allowed_menus || null,
        package: packageData,
        // Masked preview only (never full key)
        maskedLicensePreview: storedKey ? `${storedKey.slice(0, 7)}-****-${storedKey.slice(-4)}` : null,
      },
      { status: 200 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}
