// app/api/logView/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    const id = Number(body?.cardId ?? body?.articleId);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { ok: false, error: "Missing/invalid cardId" },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server misconfigured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // ✅ HER skal den ligge:
    const { error } = await supabase.rpc("log_card_view", { p_card_id: id });

    if (error) {
      console.error("logView rpc error:", error);
      return NextResponse.json(
        { ok: false, error: "RPC failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("logView error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
