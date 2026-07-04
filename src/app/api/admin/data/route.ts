import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/auth/account";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { createClient } from "@/lib/supabase/server";
import { generateLicenseKey, calculateExpiryDate, getAllowedMenus } from "@/lib/license";

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.email !== "admin@avorex.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = supabaseAdmin();

    // 1. Fetch profiles — use only known columns to avoid errors if
    //    migration 031 hasn't been applied yet.
    let profiles: any[] = [];
    try {
      const { data, error } = await db
        .from("profiles")
        .select("id, full_name, email, account_role, created_at, account_id, user_id, menu_access")
        .order("created_at", { ascending: false });
      if (error) throw error;
      profiles = data || [];
    } catch {
      // Fallback: try with minimal columns
      const { data } = await db
        .from("profiles")
        .select("id, full_name, email, account_role, created_at, account_id, user_id")
        .order("created_at", { ascending: false });
      profiles = data || [];
    }

    // Try to enrich profiles with plan from accounts
    const formattedProfiles = await Promise.all(
      profiles.map(async (p: any) => {
        let plan = "Standard";
        try {
          const { data: acct } = await db
            .from("accounts")
            .select("plan")
            .eq("id", p.account_id)
            .maybeSingle();
          plan = acct?.plan || "Standard";
        } catch {
          // ignore
        }
        return {
          id: p.id,
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          account_role: p.account_role,
          created_at: p.created_at,
          account_id: p.account_id,
          menu_access: p.menu_access || null,
          plan,
          last_login_at: p.last_login_at || null,
        };
      })
    );

    // 2. Fetch all accounts — try full columns first, fallback to safe set
    let accounts: any[] = [];
    try {
      const { data, error } = await db
        .from("accounts")
        .select("id, name, plan, created_at, license_key")
        .order("created_at", { ascending: false });
      if (error) throw error;
      accounts = data || [];
    } catch {
      const { data } = await db
        .from("accounts")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });
      accounts = (data || []).map((a: any) => ({ ...a, plan: "Standard", license_key: null }));
    }

    // 3. Fetch all license keys
    let licenseKeys: any[] = [];
    try {
      const { data, error } = await db
        .from("license_keys")
        .select("id, key_code, plan, status, workspace_id, created_at, expires_at, device_limit, notes, user_email")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      licenseKeys = (data || []).map((k: any) => ({
        id: k.id,
        key_code: k.key_code,
        plan: k.plan,
        status: k.status,
        workspace_id: k.workspace_id,
        created_at: k.created_at,
        expiry_date: k.expires_at,
        max_activations: k.device_limit || 1,
        activation_count: k.status === "used" ? 1 : 0,
        notes: k.notes,
        user_email: k.user_email
      }));
    } catch (err: any) {
      console.error("Error fetching license keys in admin data:", err.message);
      licenseKeys = [];
    }

    // 4. Fetch member presences
    let presences: any[] = [];
    try {
      const { data } = await db
        .from("member_presence")
        .select("user_id, status, last_seen_at");
      presences = data || [];
    } catch {
      presences = [];
    }

    // 5. Fetch all packages
    let packages: any[] = [];
    try {
      const { data, error: pkgFetchErr } = await db
        .from("packages")
        .select("id, name, code, features, price, price_bdt, duration_days, device_limit, popular_badge, display_order, allowed_submenus, created_at")
        .order("display_order", { ascending: true });
      
      if (pkgFetchErr) throw pkgFetchErr;
      
      packages = (data || []).map((pkg: any) => ({
        ...pkg,
        is_active: true,
        allowed_menus: getAllowedMenus(pkg.code)
      }));
    } catch (err: any) {
      console.error("Error fetching packages in admin data route:", err.message);
      packages = [];
    }

    // 6. Fetch pending transactions count
    let pendingTransactionsCount = 0;
    try {
      const { count } = await db
        .from("payment_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending");
      pendingTransactionsCount = count || 0;
    } catch {
      pendingTransactionsCount = 0;
    }

    // 7. Compute dashboard stats
    const allLicenses = licenseKeys;
    const activeLicenses = allLicenses.filter(
      (k) => k.status === "used"
    );
    const expiredLicenses = allLicenses.filter(
      (k) => k.status === "disabled"
    );
    const pendingActivations = allLicenses.filter(
      (k) => k.status === "active"
    );

    // Package distribution
    const packageDistribution: Record<string, number> = {};
    accounts.forEach((a: any) => {
      const plan = a.plan || "Standard";
      packageDistribution[plan] = (packageDistribution[plan] || 0) + 1;
    });

    return NextResponse.json({
      profiles: formattedProfiles,
      accounts,
      licenseKeys,
      presences,
      packages,
      pendingTransactionsCount,
      stats: {
        totalUsers: formattedProfiles.length,
        activeLicenses: activeLicenses.length,
        expiredLicenses: expiredLicenses.length,
        pendingActivations: pendingActivations.length,
        packageDistribution,
        recentUsers: formattedProfiles.slice(0, 5),
        recentLicenses: allLicenses.slice(0, 5),
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user || user.email !== "admin@avorex.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = supabaseAdmin();
    const body = await request.json();
    const { action } = body;

    if (action === "updateRole") {
      const { userId, targetRole, menuAccess } = body;
      if (!userId || !targetRole) {
        return NextResponse.json(
          { error: "Missing userId or targetRole" },
          { status: 400 }
        );
      }

      const updateData: Record<string, any> = {
        account_role: targetRole,
      };
      if (menuAccess) updateData.menu_access = menuAccess;

      const { error } = await db
        .from("profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (error) throw error;

      // Audit log (best-effort)
      try {
        await db.from("audit_logs").insert({
          user_id: user.id,
          action: "role_updated",
          details: { target_user_id: userId, new_role: targetRole },
        });
      } catch { /* audit_logs table may not exist yet */ }

      return NextResponse.json({ ok: true });
    }

    if (action === "createUser") {
      const { email, password, fullName, menuAccess } = body;
      if (!email || !password) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const { data: userData, error: authError } =
        await db.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (authError) throw authError;
      const newUser = userData.user;

      const { error: profileError } = await db
        .from("profiles")
        .update({
          account_role: "owner",
          menu_access: menuAccess || [],
        })
        .eq("user_id", newUser.id);

      if (profileError) {
        console.error("Failed to update profile for new user:", profileError);
        await db.auth.admin.deleteUser(newUser.id).catch(() => {});
        throw profileError;
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "updateWorkspacePlan") {
      const { workspaceId, targetPlan } = body;
      if (!workspaceId || !targetPlan) {
        return NextResponse.json(
          { error: "Missing workspaceId or targetPlan" },
          { status: 400 }
        );
      }

      // Look up package_id from the packages table by plan code
      let packageId: string | null = null;
      try {
        const { data: pkg } = await db
          .from("packages")
          .select("id")
          .eq("code", targetPlan)
          .maybeSingle();
        packageId = pkg?.id ?? null;
      } catch {
        packageId = null;
      }

      const updateData: Record<string, any> = { plan: targetPlan };
      if (packageId) updateData.package_id = packageId;

      const { error } = await db
        .from("accounts")
        .update(updateData)
        .eq("id", workspaceId);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "generateLicenseKey") {
      const {
        plan,
        duration,
        maxActivations,
        notes,
        expiryDate: customExpiryDate,
      } = body;

      if (!plan) {
        return NextResponse.json(
          { error: "Package tier is required" },
          { status: 400 }
        );
      }

      const keyCode = generateLicenseKey();
      const durationStr = duration || "30 Days";
      const startDt = new Date();

      // Calculate expiry date
      let expiryDate: string | null = null;
      if (customExpiryDate) {
        expiryDate = new Date(customExpiryDate).toISOString();
      } else {
        const calculated = calculateExpiryDate(durationStr, startDt);
        expiryDate = calculated?.toISOString() || null;
      }

      // Build insert data with only known columns
      const insertData: Record<string, any> = {
        key_code: keyCode,
        plan,
        status: "active",
      };

      // Add optional columns only if they might exist (migration 031)
      try {
        insertData.duration = durationStr;
        insertData.start_date = startDt.toISOString();
        insertData.expiry_date = expiryDate;
        insertData.max_activations = maxActivations || 1;
        insertData.activation_count = 0;
        insertData.notes = notes || null;

        const { error } = await db.from("license_keys").insert(insertData);
        if (error) throw error;
      } catch {
        // If extended columns don't exist, try minimal insert
        const { error } = await db
          .from("license_keys")
          .insert({
            key_code: keyCode,
            plan,
            status: "active",
          });
        if (error) throw error;
      }

      return NextResponse.json({ ok: true, key: keyCode });
    }

    if (action === "deleteLicenseKey") {
      const { keyId } = body;
      if (!keyId) {
        return NextResponse.json({ error: "Missing keyId" }, { status: 400 });
      }

      const { error } = await db
        .from("license_keys")
        .delete()
        .eq("id", keyId);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "deactivateLicenseKey") {
      const { keyId } = body;
      if (!keyId) {
        return NextResponse.json({ error: "Missing keyId" }, { status: 400 });
      }

      // Get the key to find the workspace it's bound to
      let keyData: any = null;
      try {
        const { data } = await db
          .from("license_keys")
          .select("workspace_id, key_code")
          .eq("id", keyId)
          .maybeSingle();
        keyData = data;
      } catch {
        // workspace_id column may not exist
      }

      const { error } = await db
        .from("license_keys")
        .update({ status: "disabled" })
        .eq("id", keyId);

      if (error) throw error;

      // If the key was bound to a workspace, clear the workspace's license
      if (keyData?.workspace_id) {
        try {
          await db
            .from("accounts")
            .update({
              license_key: null,
              plan: "Standard",
            })
            .eq("id", keyData.workspace_id);
        } catch {
          // ignore if extended columns don't exist
        }
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "transferLicense") {
      const { keyId, fromWorkspaceId, toWorkspaceId } = body;
      if (!keyId || !fromWorkspaceId || !toWorkspaceId) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Get the key data
      let keyData: any = null;
      try {
        const { data } = await db
          .from("license_keys")
          .select("*")
          .eq("id", keyId)
          .maybeSingle();
        keyData = data;
      } catch {
        return NextResponse.json(
          { error: "License key not found" },
          { status: 404 }
        );
      }

      if (!keyData) {
        return NextResponse.json(
          { error: "License key not found" },
          { status: 404 }
        );
      }

      // Remove from old workspace
      await db
        .from("accounts")
        .update({ license_key: null, plan: "Standard", package_id: null })
        .eq("id", fromWorkspaceId);

      // Look up package_id from the packages table by plan code
      let packageId: string | null = null;
      try {
        const { data: pkg } = await db
          .from("packages")
          .select("id")
          .eq("code", keyData.plan)
          .maybeSingle();
        packageId = pkg?.id ?? null;
      } catch {
        packageId = null;
      }

      // Assign to new workspace
      const transferData: Record<string, any> = {
        license_key: keyData.key_code,
        plan: keyData.plan,
      };
      if (packageId) transferData.package_id = packageId;

      await db
        .from("accounts")
        .update(transferData)
        .eq("id", toWorkspaceId);

      // Update key binding
      try {
        await db
          .from("license_keys")
          .update({ workspace_id: toWorkspaceId })
          .eq("id", keyId);
      } catch {
        // workspace_id column may not exist yet
      }

      return NextResponse.json({ ok: true });
    }

    if (action === "deleteUser") {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json(
          { error: "Missing userId" },
          { status: 400 }
        );
      }

      // Fetch user profile to get workspace (account_id), email, and auth user_id
      const { data: profile } = await db
        .from("profiles")
        .select("account_id, email, user_id")
        .eq("id", userId)
        .maybeSingle();

      const workspaceId = profile?.account_id;
      const userEmail = profile?.email;
      const authUserId = profile?.user_id;

      // 1. Delete associated license keys
      if (workspaceId) {
        await db
          .from("license_keys")
          .delete()
          .eq("workspace_id", workspaceId);
      }
      if (userEmail) {
        await db
          .from("license_keys")
          .delete()
          .eq("user_email", userEmail);
      }
      if (authUserId) {
        await db
          .from("license_keys")
          .delete()
          .eq("user_id", authUserId);
      }

      // 1b. Delete license activation logs
      if (workspaceId) {
        await db
          .from("license_activation_logs")
          .delete()
          .eq("account_id", workspaceId);
      }
      if (userId) {
        await db
          .from("license_activation_logs")
          .delete()
          .eq("user_id", userId);
      }

      // 2. Delete associated payment requests
      if (workspaceId) {
        await db
          .from("payment_requests")
          .delete()
          .eq("workspace_id", workspaceId);
      }
      if (userEmail) {
        await db
          .from("payment_requests")
          .delete()
          .eq("user_email", userEmail);
      }
      if (userId) {
        await db
          .from("payment_requests")
          .delete()
          .eq("user_id", userId);
      }

      // 3. Delete workspace account
      if (workspaceId) {
        await db
          .from("accounts")
          .delete()
          .eq("id", workspaceId);
      }

      // 4. Delete user from Supabase auth
      const { error: authError } = await db.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      return NextResponse.json({ ok: true });
    }

    if (action === "createPackage") {
      const { name, code, features, price, priceBdt, durationDays, deviceLimit, popularBadge, displayOrder, allowedSubmenus } = body;
      if (!name || !code) {
        return NextResponse.json(
          { error: "Missing name or code" },
          { status: 400 }
        );
      }

      const { error } = await db.from("packages").insert({
        name,
        code,
        features: features || [],
        price: price || `${priceBdt || 0} BDT`,
        price_bdt: priceBdt || 0,
        duration_days: durationDays || 30,
        device_limit: deviceLimit || 1,
        popular_badge: !!popularBadge,
        display_order: displayOrder || 0,
        allowed_submenus: allowedSubmenus || [],
      });
      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    if (action === "updatePackage") {
      const { packageId, name, code, features, price, priceBdt, durationDays, deviceLimit, popularBadge, displayOrder, allowedSubmenus } = body;
      if (!packageId || !name || !code) {
        return NextResponse.json(
          { error: "Missing required package details" },
          { status: 400 }
        );
      }

      const { error } = await db
        .from("packages")
        .update({
          name,
          code,
          features: features || [],
          price: price || `${priceBdt || 0} BDT`,
          price_bdt: priceBdt || 0,
          duration_days: durationDays || 30,
          device_limit: deviceLimit || 1,
          popular_badge: !!popularBadge,
          display_order: displayOrder || 0,
          allowed_submenus: allowedSubmenus || [],
        })
        .eq("id", packageId);
      if (error) throw error;

      return NextResponse.json({ ok: true });
    }

    if (action === "deletePackage") {
      const { packageId } = body;
      if (!packageId) {
        return NextResponse.json(
          { error: "Missing packageId" },
          { status: 400 }
        );
      }
      const { error } = await db
        .from("packages")
        .delete()
        .eq("id", packageId);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "extendLicense") {
      const { licenseId, workspaceId, daysToAdd, customExpiryDate } = body;
      if (!licenseId || !workspaceId) {
        return NextResponse.json(
          { error: "Missing licenseId or workspaceId" },
          { status: 400 }
        );
      }

      // Fetch license current expires_at
      const { data: licenseKey, error: keyErr } = await db
        .from("license_keys")
        .select("expires_at")
        .eq("id", licenseId)
        .maybeSingle();

      if (keyErr || !licenseKey) {
        return NextResponse.json(
          { error: "License key not found" },
          { status: 404 }
        );
      }

      let newExpiry: Date;
      if (customExpiryDate) {
        newExpiry = new Date(customExpiryDate);
      } else {
        const currentExpiry = licenseKey.expires_at ? new Date(licenseKey.expires_at) : new Date();
        const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
        newExpiry = new Date(baseDate.getTime() + Number(daysToAdd || 30) * 24 * 60 * 60 * 1000);
      }

      // Update license_keys
      const { error: keyUpdateErr } = await db
        .from("license_keys")
        .update({ expires_at: newExpiry.toISOString() })
        .eq("id", licenseId);

      if (keyUpdateErr) throw keyUpdateErr;

      // Update accounts (workspace)
      const { error: acctUpdateErr } = await db
        .from("accounts")
        .update({ license_expires_at: newExpiry.toISOString() })
        .eq("id", workspaceId);

      if (acctUpdateErr) throw acctUpdateErr;

      return NextResponse.json({ ok: true, newExpiryDate: newExpiry.toISOString() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
