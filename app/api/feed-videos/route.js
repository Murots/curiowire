// app/api/feed-videos/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 3600; // 1 hour

const VIDEO_POOL_SIZE = 20;
const VIDEO_PICK_SIZE = 5;

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

    // 1) Hent de siste postede videoene
    const { data: videos, error: videosError } = await supabase
      .from("videos")
      .select(
        "id, article_id, wow_score, posted_at, youtube_video_id, youtube_url",
      )
      .eq("status", "posted")
      .not("youtube_video_id", "is", null)
      .not("youtube_url", "is", null)
      .order("posted_at", { ascending: false })
      .limit(VIDEO_POOL_SIZE);

    if (videosError) {
      console.error("feed-videos videos query error:", videosError);
      return NextResponse.json(
        { ok: false, error: "Failed to load videos" },
        { status: 500 },
      );
    }

    const baseVideos = Array.isArray(videos) ? videos : [];

    if (!baseVideos.length) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    // 2) Sorter de siste videoene etter wow_score og ta topp 5
    const topVideos = [...baseVideos]
      .sort((a, b) => {
        const wowDiff = Number(b?.wow_score || 0) - Number(a?.wow_score || 0);
        if (wowDiff !== 0) return wowDiff;

        const bTime = b?.posted_at ? new Date(b.posted_at).getTime() : 0;
        const aTime = a?.posted_at ? new Date(a.posted_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, VIDEO_PICK_SIZE);

    const articleIds = topVideos
      .map((v) => Number(v?.article_id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (!articleIds.length) {
      return NextResponse.json({ ok: true, items: [] }, { status: 200 });
    }

    // 3) Hent artikkeldata til karusellen
    const { data: cards, error: cardsError } = await supabase
      .from("curiosity_cards")
      .select("id, title, image_url, category, created_at, status, is_listed")
      .in("id", articleIds)
      .eq("status", "published")
      .eq("is_listed", true);

    if (cardsError) {
      console.error("feed-videos cards query error:", cardsError);
      return NextResponse.json(
        { ok: false, error: "Failed to load article cards" },
        { status: 500 },
      );
    }

    const cardMap = new Map(
      (Array.isArray(cards) ? cards : []).map((card) => [
        Number(card.id),
        card,
      ]),
    );

    // 4) Slå sammen video + artikkeldata og bygg thumbnail
    const items = topVideos
      .map((video) => {
        const articleId = Number(video?.article_id);
        const card = cardMap.get(articleId);

        if (!card) return null;

        const youtubeId = String(video?.youtube_video_id || "").trim();
        if (!youtubeId) return null;

        return {
          id: Number(video.id),
          article_id: articleId,
          wow_score: Number(video?.wow_score || 0),
          posted_at: video?.posted_at || null,
          youtube_video_id: youtubeId,
          youtube_url: video?.youtube_url || null,
          thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          article: {
            id: Number(card.id),
            title: card.title || "",
            image_url: card.image_url || null,
            category: card.category || "",
            created_at: card.created_at || null,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, items }, { status: 200 });
  } catch (err) {
    console.error("feed-videos error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}
