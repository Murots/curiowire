// app/video-sitemap.xml/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BASE_URL = "https://curiowire.com";

function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return new NextResponse("Missing SUPABASE_URL", { status: 500 });
  }

  if (!serviceKey) {
    return new NextResponse("Missing SUPABASE_SERVICE_ROLE_KEY", {
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase
    .from("videos")
    .select(
      `
        article_id,
        youtube_video_id,
        youtube_url,
        posted_at,
        curiosity_cards!inner (
          id,
          title,
          seo_title,
          seo_description,
          summary_normalized,
          updated_at,
          created_at,
          status
        )
      `,
    )
    .eq("status", "posted")
    .not("youtube_video_id", "is", null)
    .order("posted_at", { ascending: false });

  if (error) {
    return new NextResponse("Failed to fetch videos", { status: 500 });
  }

  const rows = Array.isArray(data) ? data : [];

  const urls = rows
    .filter((row) => row?.curiosity_cards?.status === "published")
    .map((row) => {
      const card = row.curiosity_cards;

      const articleUrl = `${BASE_URL}/article/${card.id}`;
      const title = card.seo_title || card.title || "CurioWire video";
      const description =
        card.seo_description ||
        card.summary_normalized ||
        card.title ||
        "CurioWire short video";
      const thumbnailUrl = `https://img.youtube.com/vi/${row.youtube_video_id}/maxresdefault.jpg`;
      const embedUrl = `https://www.youtube.com/embed/${row.youtube_video_id}`;
      const publicationDate = new Date(
        row.posted_at || card.updated_at || card.created_at || Date.now(),
      ).toISOString();
      const lastmod = new Date(
        card.updated_at || card.created_at || row.posted_at || Date.now(),
      ).toISOString();

      return `
  <url>
    <loc>${xmlEscape(articleUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <video:video>
        <video:thumbnail_loc>${xmlEscape(thumbnailUrl)}</video:thumbnail_loc>
        <video:title>${xmlEscape(title)}</video:title>
        <video:description>${xmlEscape(description)}</video:description>
        <video:player_loc>${xmlEscape(embedUrl)}</video:player_loc>
        <video:duration>32</video:duration>
        <video:publication_date>${publicationDate}</video:publication_date>
    </video:video>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
>
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
