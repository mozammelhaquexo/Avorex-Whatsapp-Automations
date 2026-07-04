import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/ai/admin-client";
import { toErrorResponse } from "@/lib/auth/account";

/**
 * GET /api/packages - Fetch all active packages for purchase (Authenticated users only)
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
      .from("packages")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    return toErrorResponse(err);
  }
}
