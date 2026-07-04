import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { toErrorResponse } from "@/lib/auth/account";

/**
 * GET /api/license/history - Fetch license history of the logged-in user
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
    
    // Query license_keys where user_id matches
    const { data: licenses, error: licErr } = await db
      .from("license_keys")
      .select(`
        id,
        key_code,
        plan,
        status,
        start_date,
        expiry_date,
        duration,
        max_activations,
        activation_count,
        notes
      `)
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });

    if (licErr) throw licErr;

    // Fetch package details for each license
    const enriched = await Promise.all(
      (licenses || []).map(async (lic: any) => {
        let pkgDetails = null;
        try {
          const { data: pkg } = await db
            .from("packages")
            .select("name, features")
            .eq("code", lic.plan)
            .maybeSingle();
          pkgDetails = pkg;
        } catch {
          // ignore
        }
        return {
          ...lic,
          packageName: pkgDetails?.name || lic.plan,
          features: pkgDetails?.features || [],
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (err) {
    return toErrorResponse(err);
  }
}
