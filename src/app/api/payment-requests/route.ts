import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { toErrorResponse } from "@/lib/auth/account";
import crypto from "crypto";

/**
 * Generate a unique payment request ID
 */
function generateRequestId(): string {
  const segment = () =>
    crypto.randomBytes(2).toString("hex").toUpperCase();
  return `REQ-${segment()}-${segment()}`;
}

/**
 * GET /api/payment-requests - Fetch payment request history of the logged-in user
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No active user session. Please re-login.'}` }, { status: 401 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("payment_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/payment-requests - Submit a new manual payment request
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No active user session. Please re-login.'}` }, { status: 401 });
    }

    const body = await request.json();
    const { packageId, paymentMethod, senderNumber, transactionId, paidAmount, paymentNote, durationMonths } = body;

    if (!packageId || !paymentMethod || !senderNumber || !transactionId || !paidAmount) {
      return NextResponse.json(
        { error: "সবগুলো প্রয়োজনীয় ফিল্ড পূরণ করুন।" },
        { status: 400 }
      );
    }

    // Normalize Transaction ID
    const normalizedTrx = transactionId.replace(/\s+/g, "").toUpperCase();

    const db = supabaseAdmin();

    // 1. Double check duplicate Transaction ID
    const { data: existingTrx, error: checkErr } = await db
      .from("payment_requests")
      .select("id, status")
      .eq("transaction_id", normalizedTrx)
      .maybeSingle();

    if (checkErr) throw checkErr;
    if (existingTrx) {
      return NextResponse.json(
        { error: "এই Transaction ID ইতোমধ্যে ব্যবহার করা হয়েছে। সঠিক Transaction ID দিন।" },
        { status: 400 }
      );
    }

    // 2. Fetch package details to validate server-side
    const { data: pkg, error: pkgErr } = await db
      .from("packages")
      .select("*")
      .eq("id", packageId)
      .maybeSingle();

    if (pkgErr || !pkg) {
      return NextResponse.json(
        { error: "প্যাকেজ পাওয়া যায়নি।" },
        { status: 404 }
      );
    }

    // 3. Fetch user profile for user_name
    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const userName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
    const userEmail = user.email || "";

    const requestId = generateRequestId();
    
    // Calculate expected amount dynamically based on duration
    const months = Number(durationMonths || 1);
    let discount = 0;
    if (months === 3) discount = 0.05;
    else if (months === 6) discount = 0.10;
    else if (months === 12) discount = 0.20;

    const basePrice = Number(pkg.price_bdt || 0);
    const expectedAmount = Math.round(basePrice * months * (1 - discount));
    const packageDuration = `${months} Month${months > 1 ? 's' : ''}`;

    const { data: newRequest, error: insertErr } = await db
      .from("payment_requests")
      .insert({
        request_id: requestId,
        user_id: user.id,
        package_id: packageId,
        payment_method: paymentMethod,
        sender_number: senderNumber,
        transaction_id: normalizedTrx,
        expected_amount: expectedAmount,
        paid_amount: Number(paidAmount),
        status: "Pending",
        payment_note: paymentNote || null,
        package_name: pkg.name,
        package_duration: packageDuration,
        user_name: userName,
        user_email: userEmail
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Log in audit log
    try {
      await db.from("audit_logs").insert({
        user_id: user.id,
        action: "payment_request_submitted",
        details: {
          request_id: requestId,
          package_name: pkg.name,
          transaction_id: normalizedTrx,
          paid_amount: Number(paidAmount)
        }
      });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, data: newRequest });
  } catch (err) {
    return toErrorResponse(err);
  }
}
