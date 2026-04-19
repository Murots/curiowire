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
      60,
    );

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured" },
        { status: 500 },
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
        { status: 500 },
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const ids = rows
      .map((x) => Number(x?.id))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    // 2) Hydrate med en sikker select som matcher UI
    const { data: cards, error: cardsErr } = await supabase
      .from("curiosity_cards")
      .select(
        "id, category, title, summary_normalized, image_url, created_at, wow_score, article_type, quote_text",
      )
      .in("id", ids)
      .eq("status", "published")
      .eq("is_listed", true);

    if (cardsErr) {
      console.error("trending hydrate error:", cardsErr);
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    // 3) Hent live videoer fra view (kun videoer som faktisk er live)
    const { data: liveVideos, error: liveVideosErr } = await supabase
      .from("live_youtube_videos")
      .select(
        "article_id, youtube_video_id, youtube_url, posted_at, posted_results",
      )
      .in("article_id", ids);

    if (liveVideosErr) {
      console.error("trending live videos hydrate error:", liveVideosErr);
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    const videosByArticleId = new Map();

    (liveVideos || []).forEach((v) => {
      const articleId = Number(v?.article_id);
      if (!Number.isFinite(articleId)) return;

      if (!videosByArticleId.has(articleId)) {
        videosByArticleId.set(articleId, []);
      }

      videosByArticleId.get(articleId).push({
        youtube_video_id: v.youtube_video_id || null,
        youtube_url: v.youtube_url || null,
        posted_at: v.posted_at || null,
        posted_results: v.posted_results || null,
        status: "posted",
      });
    });

    const cardsWithVideos = (cards || []).map((card) => ({
      ...card,
      videos: videosByArticleId.get(Number(card?.id)) || [],
    }));

    const map = new Map((cardsWithVideos || []).map((c) => [Number(c.id), c]));

    // 4) Behold trending-rekkefølgen fra RPC
    const ordered = ids.map((id) => map.get(id)).filter(Boolean);

    return NextResponse.json({ ok: true, items: ordered }, { status: 200 });
  } catch (err) {
    console.error("trending error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
