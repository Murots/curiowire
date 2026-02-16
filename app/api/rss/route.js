// === app/api/rss/route.js ===
// 📰 Dynamisk RSS-feed generator for CurioWire (curiosity_cards)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// 🔒 Force canonical non-www base URL (matches your domain setup)
const rawBase = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://curiowire.com";

// Remove www + trailing slash
const BASE_URL = rawBase.replace("://www.", "://").replace(/\/$/, "");

function stripHtml(html = "") {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// RSS-safe text (avoid broken XML if someone stores weird chars)
function xmlEscape(s = "") {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pickDescription(row) {
  // Prefer explicit SEO description
  if (row?.seo_description) return stripHtml(row.seo_description);

  // Then summary_normalized (contains HTML)
  if (row?.summary_normalized) return stripHtml(row.summary_normalized);

  // Then fallback: strip card_text and truncate
  const raw = stripHtml(row?.card_text || "");
  if (raw) return raw;

  return "CurioWire curiosity.";
}

export async function GET() {
  try {
    const { data: cards, error } = await supabase
      .from("curiosity_cards")
      .select(
        "id, category, title, seo_title, seo_description, summary_normalized, card_text, created_at, image_url",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    const items = (cards || [])
      .map((c) => {
        const title = c.seo_title || c.title || "CurioWire curiosity";
        const link = `${BASE_URL}/article/${c.id}`;
        const desc = pickDescription(c);

        // RSS wants RFC-822 date string
        const pubDate = c.created_at
          ? new Date(c.created_at).toUTCString()
          : new Date().toUTCString();

        // NOTE:
        // - Keep title + description in CDATA to avoid edge-case escapes
        // - guid should be stable (id-based link is perfect)
        return `
<item>
  <title><![CDATA[${title}]]></title>
  <link>${link}</link>
  <guid isPermaLink="true">${link}</guid>
  <category>${xmlEscape(c.category || "curiosities")}</category>
  <pubDate>${pubDate}</pubDate>
  <description><![CDATA[${desc.slice(0, 500)}]]></description>
  ${
    c.image_url
      ? `<enclosure url="${xmlEscape(c.image_url)}" type="image/jpeg" />`
      : ""
  }
</item>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>CurioWire — Automated Curiosity Newspaper</title>
  <link>${BASE_URL}</link>
  <description>Fresh, short curiosities — updated daily.</description>
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
        // RSS should not be indexed as a "page" in Google
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("❌ RSS generation failed:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to generate RSS" },
      { status: 500 },
    );
  }
}
