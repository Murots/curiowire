// app/api/old-gems/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour

const OLD_GEMS_POOL_SIZE = 10;
const OLD_GEMS_PICK_SIZE = 5;
const MIN_AGE_DAYS = 60;

function shuffleArray(input) {
  const arr = Array.isArray(input) ? [...input] : [];

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

export async function GET() {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const cutoffIso = new Date(
      Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    // 1) Hent de 10 mest sette artiklene som er eldre enn 60 dager
    const { data: cards, error } = await supabase
      .from("curiosity_cards")
      .select(
        "id, title, image_url, category, created_at, views, wow_score, article_type, quote_text",
      )
      .eq("status", "published")
      .eq("is_listed", true)
      .lt("created_at", cutoffIso)
      .order("views", { ascending: false })
      .order("wow_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(OLD_GEMS_POOL_SIZE);

    if (error) {
      console.error("old-gems query error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to load old gems" },
        { status: 500 },
      );
    }

    const pool = Array.isArray(cards) ? cards : [];

    if (!pool.length) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    // 2) Bland de 10 beste og vis 5 tilfeldige
    const items = shuffleArray(pool)
      .slice(0, OLD_GEMS_PICK_SIZE)
      .map((card) => ({
        id: Number(card.id),
        title: card.title || "",
        image_url: card.image_url || null,
        category: card.category || "",
        created_at: card.created_at || null,
        views: Number(card.views || 0),
        wow_score: Number(card.wow_score || 0),
        article_type: card.article_type || "single",
        quote_text: card.quote_text || null,
      }));

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (err) {
    console.error("old-gems error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
