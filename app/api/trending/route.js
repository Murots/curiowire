// app/api/trending/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cache i 1 time (på Vercel/Next runtime)
export const revalidate = 3600;

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || 10), 1),
      60
    );

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Hent trending IDs (og evt. ekstra felter) fra RPC
    const { data, error } = await supabase.rpc("get_trending_week", {
      p_limit: limit,
    });

    if (error) {
      console.error("trending rpc error:", error);
      return NextResponse.json(
        { ok: false, error: "RPC failed" },
        { status: 500 }
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const ids = rows
      .map((x) => Number(x?.id))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    // 2) Hydrate med en sikker select som matcher UI (inkl wow_score)
    const { data: cards, error: cardsErr } = await supabase
      .from("curiosity_cards")
      .select(
        "id, category, title, summary_normalized, image_url, created_at, wow_score"
      )
      .in("id", ids)
      .eq("status", "published");

    if (cardsErr) {
      console.error("trending hydrate error:", cardsErr);
      // fallback: returner raw rpc-data hvis hydrate feiler
      return NextResponse.json({ ok: true, items: rows }, { status: 200 });
    }

    const map = new Map((cards || []).map((c) => [Number(c.id), c]));

    // 3) Behold trending-rekkefølgen fra RPC
    const ordered = ids.map((id) => map.get(id)).filter(Boolean);

    return NextResponse.json({ ok: true, items: ordered }, { status: 200 });
  } catch (err) {
    console.error("trending error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
