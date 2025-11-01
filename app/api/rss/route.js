// === app/api/rss/route.js ===
// 📰 Dynamisk RSS-feed generator for CurioWire

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BASE_URL = "https://curiowire.com";

export async function GET() {
  try {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("id, title, excerpt, category, created_at, image_url")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    const items = articles
      .map(
        (a) => `
<item>
  <title><![CDATA[${a.title}]]></title>
  <link>${BASE_URL}/article/${a.id}</link>
  <guid>${BASE_URL}/article/${a.id}</guid>
  <category>${a.category}</category>
  <pubDate>${new Date(a.created_at).toUTCString()}</pubDate>
  <description><![CDATA[${a.excerpt || "Curious story"}]]></description>
  ${a.image_url ? `<enclosure url="${a.image_url}" type="image/jpeg" />` : ""}
</item>`
      )
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>CurioWire — Automated Curiosity Newspaper</title>
  <link>${BASE_URL}</link>
  <description>AI-generated stories and hidden histories — updated daily.</description>
  <language>en</language>
  <atom:link href="${BASE_URL}/api/rss" rel="self" type="application/rss+xml"/>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  ${items}
</channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("❌ RSS generation failed:", err.message);
    return NextResponse.json(
      { error: "Failed to generate RSS" },
      { status: 500 }
    );
  }
}
