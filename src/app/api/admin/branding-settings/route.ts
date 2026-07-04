import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { toErrorResponse } from "@/lib/auth/account";

/**
 * GET /api/admin/branding-settings - Read default branding configurations
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("branding_settings")
      .select("*")
      .eq("is_default", true)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json(data || {});
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/admin/branding-settings - Update branding configurations (Admin only)
 */
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

    const body = await request.json();
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("branding_settings")
      .update({
        software_name: body.software_name,
        brand_name: body.brand_name,
        brand_logo_url: body.brand_logo_url,
        support_whatsapp: body.support_whatsapp,
        bkash_number: body.bkash_number,
        nagad_number: body.nagad_number,
        rocket_number: body.rocket_number,
        payment_instruction: body.payment_instruction,
        currency: body.currency,
        currency_symbol: body.currency_symbol,
        default_country: body.default_country,
        payment_type: body.payment_type,
        updated_at: new Date().toISOString(),
      })
      .eq("is_default", true)
      .select()
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
