import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { toErrorResponse } from "@/lib/auth/account";
import { calculateExpiryDate, getAllowedMenus } from "@/lib/license";
import crypto from "crypto";

/**
 * Generate formatted digital license key
 * Format: {BRAND}-{PACKAGE_CODE}-{RANDOM_SECURE_BLOCK}-{RANDOM_SECURE_BLOCK}
 */
function generateFormattedLicenseKey(brandName: string, packageCode: string): string {
  const cleanBrand = (brandName || "AVX").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 3);
  const cleanCode = (packageCode || "PRM").toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 3);

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Readable alphanumeric chars (no O, 0, I, 1)
  const generateBlock = (len = 4) => {
    let result = "";
    const randomBytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      result += chars.charAt(randomBytes[i] % chars.length);
    }
    return result;
  };

  return `${cleanBrand}-${cleanCode}-${generateBlock()}-${generateBlock()}`;
}

/**
 * GET /api/admin/payment-requests - Fetch all payment requests (Admin only)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.email !== "admin@avorex.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const packageType = searchParams.get("packageType");
    const query = searchParams.get("query");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const db = supabaseAdmin();
    let q = db.from("payment_requests").select("*");

    if (status && status !== "All") {
      q = q.eq("status", status);
    }
    if (paymentMethod && paymentMethod !== "All") {
      q = q.eq("payment_method", paymentMethod);
    }
    if (packageType && packageType !== "All") {
      q = q.eq("package_name", packageType);
    }
    if (startDate) {
      q = q.gte("submitted_at", startDate);
    }
    if (endDate) {
      q = q.lte("submitted_at", endDate);
    }

    const { data, error } = await q.order("submitted_at", { ascending: false });
    if (error) throw error;

    let filtered = data || [];

    if (query) {
      const lowerQuery = query.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.user_name?.toLowerCase().includes(lowerQuery) ||
          r.user_email?.toLowerCase().includes(lowerQuery) ||
          r.transaction_id?.toLowerCase().includes(lowerQuery) ||
          r.sender_number?.toLowerCase().includes(lowerQuery) ||
          r.request_id?.toLowerCase().includes(lowerQuery)
      );
    }

    return NextResponse.json(filtered);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/admin/payment-requests - Manage payment request (Approve, Reject, Under Review)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: adminUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !adminUser || adminUser.email !== "admin@avorex.com") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, adminNote } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const db = supabaseAdmin();

    if (action === "deleteAllRequests") {
      const { error } = await db
        .from("payment_requests")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "deleteRequest") {
      if (!requestId) {
        return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
      }
      const { error } = await db
        .from("payment_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (!requestId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch current transaction request details
    const { data: trx, error: trxErr } = await db
      .from("payment_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (trxErr || !trx) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    // 2. Prevent actions on approved transactions
    if (trx.status === "Approved") {
      return NextResponse.json(
        { error: "এই পেমেন্ট রিকোয়েস্টটি ইতিমধ্যে অনুমোদিত হয়েছে।" },
        { status: 400 }
      );
    }

    const updatedData: Record<string, any> = {
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
      admin_note: adminNote || trx.admin_note,
    };

    if (action === "approve") {
      // Approve flow
      updatedData.status = "Approved";

      // A. Load dynamic branding settings
      const { data: branding } = await db
        .from("branding_settings")
        .select("brand_name, brand_logo_url, software_name, currency_symbol")
        .eq("is_default", true)
        .maybeSingle();

      const brandName = branding?.brand_name || "AVX";

      // B. Fetch package info
      const { data: pkg, error: pkgErr } = await db
        .from("packages")
        .select("*")
        .eq("id", trx.package_id)
        .maybeSingle();

      if (pkgErr || !pkg) {
        return NextResponse.json({ error: "Associated package not found" }, { status: 404 });
      }

      // C. Generate key
      const keyStr = generateFormattedLicenseKey(brandName, pkg.code);
      const durationStr = trx.package_duration || pkg.duration || "30 Days";
      const startDt = new Date();
      const expiresAt = calculateExpiryDate(durationStr, startDt);

      // D. Find user's profile to get account_id (workspace)
      const { data: profile, error: profErr } = await db
        .from("profiles")
        .select("account_id, full_name")
        .eq("user_id", trx.user_id)
        .maybeSingle();

      if (profErr || !profile || !profile.account_id) {
        return NextResponse.json(
          { error: "ব্যবহারকারীর কোনো ওয়ার্কস্পেস পাওয়া যায়নি।" },
          { status: 404 }
        );
      }

      const allowedMenus = pkg.allowed_menus || getAllowedMenus(pkg.code);

      // E. Create license in license_keys
      const { data: license, error: licenseErr } = await db
        .from("license_keys")
        .insert({
          key_code: keyStr,
          plan: pkg.code,
          status: "used",
          workspace_id: profile.account_id,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          device_limit: pkg.device_limit || 1,
          user_email: trx.user_email || "",
          notes: `Approved payment request: ${trx.request_id}`,
          duration_days: pkg.duration_days || 30,
          duration_type: "days",
          activated_at: startDt.toISOString(),
          package_id: pkg.id,
          allowed_menus: allowedMenus,
        })
        .select()
        .single();

      if (licenseErr) throw licenseErr;

      // F. Update accounts (workspace) with new license details
      const { error: acctUpdateErr } = await db
        .from("accounts")
        .update({
          license_key: keyStr,
          plan: pkg.code,
          package_id: pkg.id,
          license_activated_at: startDt.toISOString(),
          license_expires_at: expiresAt ? expiresAt.toISOString() : null,
          allowed_menus: allowedMenus,
        })
        .eq("id", profile.account_id);

      if (acctUpdateErr) throw acctUpdateErr;

      // G. Log activation log
      try {
        await db.from("license_activation_logs").insert({
          license_key_id: license.id,
          user_id: trx.user_id,
          account_id: profile.account_id,
          action: "activate",
          success: true,
        });
      } catch {
        // ignore
      }

      // H. Create an in-app notification if table allows
      try {
        await db.from("notifications").insert({
          account_id: profile.account_id,
          user_id: trx.user_id,
          type: "conversation_assigned", // workaround check constraints or use fallback
          title: "লাইসেন্স অ্যাক্টিভ হয়েছে!",
          body: `আপনার ${pkg.name} প্যাকেজ লাইসেন্সটি অনুমোদিত এবং অ্যাক্টিভ করা হয়েছে। কী: ${keyStr}`,
        });
      } catch {
        // ignore if check constraints fail
      }

      // H-2. Send payment confirmed email
      try {
        const { sendPaymentConfirmedEmail } = await import("@/lib/email");
        const { logEmail } = await import("@/lib/email/log");
        // Get user email from auth
        const { data: authUser } = await db.auth.admin.getUserById(trx.user_id);
        const userEmail = authUser?.user?.email;
        if (userEmail) {
          const sent = await sendPaymentConfirmedEmail(userEmail, {
            userName: profile.full_name || "User",
            plan: pkg.name,
            amount: `${branding?.currency_symbol || "৳"}${trx.paid_amount}`,
            method: trx.payment_method,
            transactionId: trx.transaction_id,
            licenseKey: keyStr,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
          }, {
            brandName: branding?.brand_name,
            brandLogoUrl: branding?.brand_logo_url,
            softwareName: branding?.software_name,
            currencySymbol: branding?.currency_symbol,
          });
          await logEmail({
            accountId: profile.account_id,
            userId: trx.user_id,
            recipient: userEmail,
            subject: `Payment Confirmed — ${pkg.name} License`,
            emailType: "payment_confirmed",
            status: sent ? "sent" : "failed",
            metadata: { package: pkg.name, amount: trx.paid_amount },
          });
        }
      } catch (emailErr) {
        console.error("[payment-approve] Email send failed:", emailErr);
      }

      // I. Log audit logs
      try {
        await db.from("audit_logs").insert({
          account_id: profile.account_id,
          user_id: adminUser.id,
          action: "payment_approved",
          details: {
            request_id: trx.request_id,
            license_key: keyStr,
            user_id: trx.user_id,
            package_name: pkg.name
          }
        });
      } catch {
        // ignore
      }

    } else if (action === "reject") {
      updatedData.status = "Rejected";

      // Log audit
      try {
        await db.from("audit_logs").insert({
          user_id: adminUser.id,
          action: "payment_rejected",
          details: {
            request_id: trx.request_id,
            reason: adminNote
          }
        });
      } catch {
        // ignore
      }

    } else if (action === "review") {
      updatedData.status = "Under Review";
    }

    // 3. Update payment request status
    const { data: updatedTrx, error: updateErr } = await db
      .from("payment_requests")
      .update(updatedData)
      .eq("id", requestId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true, data: updatedTrx });
  } catch (err) {
    return toErrorResponse(err);
  }
}
