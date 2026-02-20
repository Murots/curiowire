// === app/api/sitemap/route.js ===
// 📄 Dynamisk sitemap.xml generator for CurioWire (curiosity_cards)

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ✅ Server-only Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// 🔒 Force canonical non-www base URL
const rawBase = process.env.NEXT_PUBLIC_BASE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_BASE_URL
  : "https://curiowire.com";

// Remove www + trailing slash
const BASE_URL = rawBase.replace("://www.", "://").replace(/\/$/, "");

// ✅ Same category slugs as your app/[category] route (no "all")
const CATEGORY_SLUGS = [
  "science",
  "technology",
  "space",
  "nature",
  "health",
  "history",
  "culture",
  "sports",
  "products",
  "world",
  "crime",
  "mystery",
];

// XML escaping for safety (URLs are usually clean, but this prevents edge cases)
function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  try {
    const { data: cards, error } = await supabase
      .from("curiosity_cards")
      .select("id, created_at, updated_at, category")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "❌ Failed to fetch curiosity_cards for sitemap:",
        error.message,
      );
      return NextResponse.json(
        { error: "Failed to generate sitemap" },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();

    // ✅ Category pages (clean URLs like /science)
    // We keep them stable + indexable, even though they render the same feed with a default filter.
    const categoryUrls = CATEGORY_SLUGS.map((slug) => {
      return `
  <url>
    <loc>${xmlEscape(`${BASE_URL}/${slug}`)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join("");

    const urls = (cards || [])
      .map((c) => {
        const lastmod = new Date(c.updated_at || c.created_at).toISOString();
        return `
  <url>
    <loc>${xmlEscape(`${BASE_URL}/article/${c.id}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${xmlEscape(BASE_URL)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${categoryUrls}
  ${urls}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        // Sitemap is XML; include charset for safety
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("❌ Sitemap generation error:", err.message);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
